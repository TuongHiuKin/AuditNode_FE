import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const defaultManifest = path.resolve("contracts/openapi/auditnode-api-v1.metadata.json");
const manifestInput = path.resolve(process.argv[3] ?? defaultManifest);
const manifest = JSON.parse(readFileSync(manifestInput, "utf8"));
const expectedBackendCommit = process.env.EXPECTED_BACKEND_SHA;

if (manifest.schemaVersion !== 1) {
  throw new Error("Unsupported pinned OpenAPI metadata schema version.");
}

if (!/^[0-9a-f]{40}$/.test(manifest.backendCommit ?? "")) {
  throw new Error("Pinned OpenAPI metadata must contain a full lowercase backend commit SHA.");
}

if (expectedBackendCommit && manifest.backendCommit !== expectedBackendCommit) {
  throw new Error(
    `Pinned OpenAPI backend SHA mismatch: expected ${expectedBackendCommit}, received ${manifest.backendCommit}.`,
  );
}

if (!/^[0-9a-f]{64}$/.test(manifest.sha256 ?? "")) {
  throw new Error("Pinned OpenAPI metadata must contain a lowercase SHA-256 checksum.");
}

const pinnedArtifact = path.resolve(path.dirname(manifestInput), manifest.artifact ?? "");
const requestedArtifact = process.argv[2]
  ? path.resolve(process.argv[2])
  : pinnedArtifact;

if (requestedArtifact !== pinnedArtifact) {
  throw new Error("The requested OpenAPI input does not match the artifact pinned by metadata.");
}

const artifactBytes = readFileSync(pinnedArtifact);
const artifactChecksum = createHash("sha256").update(artifactBytes).digest("hex");

if (artifactChecksum !== manifest.sha256) {
  throw new Error(
    `Pinned OpenAPI checksum mismatch: expected ${manifest.sha256}, received ${artifactChecksum}.`,
  );
}

const output = path.resolve("src/shared/api/v1-contract.ts");
const syncScript = path.resolve("scripts/sync-api.mjs");
const checkedInContract = readFileSync(output);

function generate() {
  const result = spawnSync(process.execPath, [syncScript, pinnedArtifact], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `OpenAPI contract generation failed with exit code ${result.status ?? "unknown"}.`,
    );
  }
  return readFileSync(output);
}

try {
  const firstGeneration = generate();
  const secondGeneration = generate();

  if (!firstGeneration.equals(secondGeneration)) {
    throw new Error("OpenAPI contract generation is not deterministic.");
  }

  if (!checkedInContract.equals(secondGeneration)) {
    throw new Error(
      "Generated API contract differs from the checked-in contract. Run npm run sync-api:safe -- <artifact> and review the result.",
    );
  }

  console.log(
    `OpenAPI contract is current and deterministic for backend ${manifest.backendCommit}.`,
  );
} finally {
  writeFileSync(output, checkedInContract);
}
