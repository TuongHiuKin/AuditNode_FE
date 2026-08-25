import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
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

  it("rejects deterministic verification without a pinned artifact", () => {
    const result = spawnSync(process.execPath, [path.resolve(projectRoot, "scripts/verify-api-contract.mjs")], {
      cwd: projectRoot,
      env: { ...process.env, OPENAPI_INPUT: "", OPENAPI_URL: "" },
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/pinned OpenAPI artifact/i);
  });
});
