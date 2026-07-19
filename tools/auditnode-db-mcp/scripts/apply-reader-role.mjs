import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotEnv } from "dotenv";
import pg from "pg";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const toolDirectory = resolve(scriptDirectory, "..");
const backendSettingsPath = resolve(
  scriptDirectory,
  "../../../../AuditNode.Backend/AuditNode.API/appsettings.json",
);
const readerRole = "auditnode_chat_reader";
const requiredTables = [
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
  return Object.fromEntries(
    connectionString
      .split(";")
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        return [
          part.slice(0, separator).trim().toLowerCase(),
          part.slice(separator + 1).trim(),
        ];
      }),
  );
}

loadDotEnv({ path: resolve(toolDirectory, ".env.local") });

const readerPassword = process.env.POSTGRES_PASSWORD;
if (
  !readerPassword ||
  readerPassword === "PUT_READER_PASSWORD_HERE"
) {
  throw new Error(
    "POSTGRES_PASSWORD must be filled in .env.local before creating the role.",
  );
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
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingRole = await client.query(
      "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS exists",
      [readerRole],
    );
    const roleWasCreated = !existingRole.rows[0].exists;

    await client.query(
      "SELECT set_config('auditnode.reader_password', $1, true)",
      [readerPassword],
    );
    await client.query(`
      DO $auditnode_role$
      DECLARE
        configured_password text :=
          current_setting('auditnode.reader_password', true);
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_roles WHERE rolname = 'auditnode_chat_reader'
        ) THEN
          EXECUTE FORMAT(
            'CREATE ROLE auditnode_chat_reader WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION',
            configured_password
          );
        ELSE
          EXECUTE FORMAT(
            'ALTER ROLE auditnode_chat_reader WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION',
            configured_password
          );
        END IF;
      END
      $auditnode_role$
    `);

    await client.query(
      "ALTER ROLE auditnode_chat_reader SET default_transaction_read_only = on",
    );
    await client.query(
      "ALTER ROLE auditnode_chat_reader SET statement_timeout = '5s'",
    );
    await client.query(
      "ALTER ROLE auditnode_chat_reader SET idle_in_transaction_session_timeout = '6s'",
    );
    await client.query(`
      DO $auditnode_database_grant$
      BEGIN
        EXECUTE FORMAT(
          'GRANT CONNECT ON DATABASE %I TO auditnode_chat_reader',
          current_database()
        );
      END
      $auditnode_database_grant$
    `);
    await client.query(
      "GRANT USAGE ON SCHEMA public TO auditnode_chat_reader",
    );
    await client.query(
      `
        GRANT SELECT ON TABLE
          public.labels,
          public.server_labels,
          public.application_labels,
          public.servers,
          public.applications,
          public.port_mappings,
          public.app_dependencies,
          public.boundary_frames,
          public.datacenters
        TO auditnode_chat_reader
      `,
    );

    const tableCheck = await client.query(
      `
        SELECT COUNT(*)::int AS existing_table_count
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
      `,
      [requiredTables],
    );

    if (tableCheck.rows[0].existing_table_count !== requiredTables.length) {
      throw new Error(
        "Not all required AuditNode tables exist; role setup was rolled back.",
      );
    }

    await client.query("COMMIT");
    console.log(
      JSON.stringify(
        {
          role: readerRole,
          action: roleWasCreated ? "created" : "updated",
          defaultReadOnly: true,
          selectTableCount: requiredTables.length,
          passwordPrinted: false,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
