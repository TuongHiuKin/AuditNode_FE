import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

describe("safe OpenAPI synchronization", () => {
  it("rejects synchronization without an explicit artifact or URL", () => {
    const result = spawnSync(process.execPath, [path.resolve(projectRoot, "scripts/sync-api.mjs")], {
      cwd: projectRoot,
      env: { ...process.env, OPENAPI_INPUT: "", OPENAPI_URL: "" },
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/OpenAPI artifact path/i);
  });

  it("keeps TLS verification enabled in executable sync configuration", () => {
    const packageJson = readFileSync(path.resolve(projectRoot, "package.json"), "utf8");
    const syncScript = readFileSync(path.resolve(projectRoot, "scripts/sync-api.mjs"), "utf8");
    const verifyScript = readFileSync(path.resolve(projectRoot, "scripts/verify-api-contract.mjs"), "utf8");

    expect(`${packageJson}\n${syncScript}\n${verifyScript}`).not.toContain("NODE_TLS_REJECT_UNAUTHORIZED");
  });

  it("verifies deterministic generation from the committed SHA-pinned artifact", () => {
    const result = spawnSync(process.execPath, [path.resolve(projectRoot, "scripts/verify-api-contract.mjs")], {
      cwd: projectRoot,
      env: { ...process.env, OPENAPI_INPUT: "", OPENAPI_URL: "https://unpinned.invalid/openapi.json" },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/backend [0-9a-f]{40}/i);
  }, 30_000);

  it("binds the committed artifact to its backend SHA and checksum metadata", () => {
    const metadata = JSON.parse(
      readFileSync(
        path.resolve(projectRoot, "contracts/openapi/auditnode-api-v1.metadata.json"),
        "utf8",
      ),
    ) as { artifact: string; backendCommit: string; sha256: string };
    const artifact = readFileSync(
      path.resolve(projectRoot, "contracts/openapi", metadata.artifact),
    );

    expect(metadata.backendCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(metadata.sha256).toBe(createHash("sha256").update(artifact).digest("hex"));
  });

  it("rejects release verification when metadata is pinned to a different backend SHA", () => {
    const result = spawnSync(
      process.execPath,
      [path.resolve(projectRoot, "scripts/verify-api-contract.mjs")],
      {
        cwd: projectRoot,
        env: { ...process.env, EXPECTED_BACKEND_SHA: "f".repeat(40) },
        encoding: "utf8",
      },
    );

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/backend SHA mismatch/i);
  });

  it("creates checksum metadata beside a runtime OpenAPI artifact", () => {
    const temporaryRoot = mkdtempSync(path.join(tmpdir(), "auditnode-openapi-metadata-"));
    const artifactPath = path.join(temporaryRoot, "runtime.json");
    const metadataPath = path.join(temporaryRoot, "runtime.metadata.json");
    const artifact = Buffer.from('{"openapi":"3.1.0","paths":{}}\n');
    const backendCommit = "b".repeat(40);

    try {
      writeFileSync(artifactPath, artifact);
      const result = spawnSync(
        process.execPath,
        [
          path.resolve(projectRoot, "scripts/create-openapi-metadata.mjs"),
          artifactPath,
          backendCommit,
          metadataPath,
        ],
        { cwd: projectRoot, encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      expect(JSON.parse(readFileSync(metadataPath, "utf8"))).toMatchObject({
        schemaVersion: 1,
        backendCommit,
        artifact: "runtime.json",
        sha256: createHash("sha256").update(artifact).digest("hex"),
      });
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("rejects an artifact that is not selected by the committed metadata", () => {
    const result = spawnSync(
      process.execPath,
      [path.resolve(projectRoot, "scripts/verify-api-contract.mjs"), "README.md"],
      { cwd: projectRoot, encoding: "utf8" },
    );

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/does not match the artifact pinned/i);
  });

  it("restores the checked-in contract when generation fails after overwriting it", () => {
    const temporaryRoot = mkdtempSync(path.join(tmpdir(), "auditnode-openapi-restore-"));
    const originalContract = "export interface OriginalContract {}\n";
    const artifact = Buffer.from('{"openapi":"3.0.0"}\n');

    try {
      mkdirSync(path.join(temporaryRoot, "scripts"), { recursive: true });
      mkdirSync(path.join(temporaryRoot, "src/shared/api"), { recursive: true });
      mkdirSync(path.join(temporaryRoot, "contracts/openapi"), { recursive: true });

      copyFileSync(
        path.resolve(projectRoot, "scripts/verify-api-contract.mjs"),
        path.join(temporaryRoot, "scripts/verify-api-contract.mjs"),
      );
      writeFileSync(
        path.join(temporaryRoot, "scripts/sync-api.mjs"),
        [
          'import { writeFileSync } from "node:fs";',
          'writeFileSync("src/shared/api/v1-contract.ts", "corrupted contract\\n");',
          "process.exitCode = 23;",
          "",
        ].join("\n"),
      );
      writeFileSync(
        path.join(temporaryRoot, "src/shared/api/v1-contract.ts"),
        originalContract,
      );
      writeFileSync(
        path.join(temporaryRoot, "contracts/openapi/auditnode-api-v1.json"),
        artifact,
      );
      writeFileSync(
        path.join(temporaryRoot, "contracts/openapi/auditnode-api-v1.metadata.json"),
        JSON.stringify({
          schemaVersion: 1,
          backendCommit: "a".repeat(40),
          artifact: "auditnode-api-v1.json",
          sha256: createHash("sha256").update(artifact).digest("hex"),
        }),
      );

      const result = spawnSync(
        process.execPath,
        [path.join(temporaryRoot, "scripts/verify-api-contract.mjs")],
        { cwd: temporaryRoot, encoding: "utf8" },
      );

      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toMatch(/exit code 23/i);
      expect(
        readFileSync(path.join(temporaryRoot, "src/shared/api/v1-contract.ts"), "utf8"),
      ).toBe(originalContract);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
});
