import { config as loadDotEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(moduleDirectory, "..");

let environmentLoaded = false;

const environmentSchema = z.object({
  POSTGRES_HOST: z.string().trim().min(1),
  POSTGRES_PORT: z.coerce.number().int().min(1).max(65_535).default(5432),
  POSTGRES_DATABASE: z.string().trim().min(1),
  POSTGRES_USER: z.string().trim().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  AUDITNODE_DB_SSL_MODE: z.enum(["disable", "require"]).default("disable"),
  AUDITNODE_OWNER_ID: z.string().trim().min(1),
  AUDITNODE_MCP_QUERY_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(30_000)
    .default(5_000),
  AUDITNODE_MCP_MAX_ROWS: z.coerce
    .number()
    .int()
    .min(1)
    .max(500)
    .default(200),
});

export interface AuditNodeDbConfig {
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl: false | { rejectUnauthorized: boolean };
  };
  ownerId: string;
  queryTimeoutMs: number;
  maxRows: number;
}

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AuditNodeDbConfig {
  if (environment === process.env && !environmentLoaded) {
    loadDotEnv({ path: resolve(projectDirectory, ".env.local") });
    environmentLoaded = true;
  }

  const parsed = environmentSchema.parse(environment);

  return {
    database: {
      host: parsed.POSTGRES_HOST,
      port: parsed.POSTGRES_PORT,
      database: parsed.POSTGRES_DATABASE,
      user: parsed.POSTGRES_USER,
      password: parsed.POSTGRES_PASSWORD,
      ssl:
        parsed.AUDITNODE_DB_SSL_MODE === "require"
          ? { rejectUnauthorized: true }
          : false,
    },
    ownerId: parsed.AUDITNODE_OWNER_ID,
    queryTimeoutMs: parsed.AUDITNODE_MCP_QUERY_TIMEOUT_MS,
    maxRows: parsed.AUDITNODE_MCP_MAX_ROWS,
  };
}

export function formatConfigurationError(error: unknown): string {
  if (error instanceof z.ZodError) {
    const fields = error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");

    return `Database MCP is not configured. Check .env.local fields: ${fields}.`;
  }

  return "Database MCP configuration could not be loaded.";
}
