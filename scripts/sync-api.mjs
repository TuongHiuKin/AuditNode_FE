import { spawn } from "node:child_process";
import path from "node:path";

const openApiInput = process.argv[2] ?? process.env.OPENAPI_INPUT ?? process.env.OPENAPI_URL;

if (!openApiInput) {
  throw new Error(
    "Pass an OpenAPI artifact path (recommended) or set OPENAPI_INPUT/OPENAPI_URL.",
  );
}

const output = path.resolve("src/shared/api/v1-contract.ts");
const cli = path.resolve("node_modules/openapi-typescript/bin/cli.js");
const child = spawn(process.execPath, [cli, openApiInput, "--output", output], {
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
