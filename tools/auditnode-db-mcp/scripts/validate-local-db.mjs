import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { QUERY_DEFINITIONS } from "../dist/queries.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const backendSettingsPath = resolve(
  scriptDirectory,
  "../../../../AuditNode.Backend/AuditNode.API/appsettings.json",
);
const validationOwner = "__auditnode_mcp_sql_validation_no_match__";
const schemaTables = [
  "labels",
  "server_labels",
  "application_labels",
  "servers",
  "applications",
  "port_mappings",
  "app_dependencies",
  "boundary_frames",
  "datacenters",
];

function parseConnectionString(connectionString) {
  const fields = connectionString
    .split(";")
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf("=");
      return [
        part.slice(0, separator).trim().toLowerCase(),
        part.slice(separator + 1).trim(),
      ];
    });

  return Object.fromEntries(fields);
}

const settingsText = readFileSync(backendSettingsPath, "utf8").replace(
  /^\uFEFF/,
  "",
);
const settings = JSON.parse(settingsText);
const connection = parseConnectionString(
  settings.ConnectionStrings.DefaultConnection,
);
const pool = new pg.Pool({
  host: connection.host,
  port: Number(connection.port ?? 5432),
  database: connection.database,
  user: connection.username ?? connection["user id"] ?? connection.user,
  password: connection.password,
  ssl: false,
  connectionTimeoutMillis: 5_000,
  max: 1,
});

try {
  for (const [name, definition] of Object.entries(QUERY_DEFINITIONS)) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN READ ONLY");
      await client.query(
        "SELECT set_config('statement_timeout', $1, true)",
        ["5s"],
      );

      const values = definition.ownerScoped
        ? definition.usesLimit
          ? [validationOwner, 2]
          : [validationOwner]
        : [schemaTables];

      const result = await client.query(definition.sql, values);
      await client.query("ROLLBACK");
      console.log(
        `${name}: SQL_OK (${result.rowCount ?? 0} aggregate rows)`,
      );
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw new Error(`${name}: ${error.message}`);
    } finally {
      client.release();
    }
  }
} finally {
  await pool.end();
}
