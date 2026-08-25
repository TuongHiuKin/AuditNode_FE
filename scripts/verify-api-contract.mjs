import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const openApiInput = process.argv[2] ?? process.env.OPENAPI_INPUT ?? process.env.OPENAPI_URL;

if (!openApiInput) {
  throw new Error(
    "Pass the pinned OpenAPI artifact path to verify deterministic contract generation.",
  );
}

const output = path.resolve("src/shared/api/v1-contract.ts");
const syncScript = path.resolve("scripts/sync-api.mjs");
const checkedInContract = readFileSync(output);

function generate() {
  const result = spawnSync(process.execPath, [syncScript, openApiInput], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return readFileSync(output);
}

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

console.log("OpenAPI contract is current and deterministic.");
