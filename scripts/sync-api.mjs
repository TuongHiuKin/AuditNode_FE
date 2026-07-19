import { spawn } from "node:child_process";
import path from "node:path";

const openApiUrl = process.env.OPENAPI_URL;

if (!openApiUrl) {
  throw new Error("Set OPENAPI_URL to the backend OpenAPI document before running sync-api.");
}

const output = path.resolve("src/shared/api/v1-contract.ts");
const cli = path.resolve("node_modules/openapi-typescript/bin/cli.js");
const child = spawn(process.execPath, [cli, openApiUrl, "--output", output], {
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
