import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const backendSettingsPath = resolve(
  scriptDirectory,
  "../../../../AuditNode.Backend/AuditNode.API/appsettings.json",
);
const readerRole = "auditnode_chat_reader";
const expectedTables = [
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
    await client.query("BEGIN READ ONLY");
    const roleResult = await client.query(
      `
        SELECT
          r.rolcanlogin AS can_login,
          r.rolsuper AS is_superuser,
          r.rolcreatedb AS can_create_database,
          r.rolcreaterole AS can_create_role,
          COALESCE(
            BOOL_OR(
              'default_transaction_read_only=on' =
              ANY(COALESCE(s.setconfig, ARRAY[]::text[]))
            ),
            false
          ) AS default_read_only
        FROM pg_roles r
        LEFT JOIN pg_db_role_setting s ON s.setrole = r.oid
        WHERE r.rolname = $1
        GROUP BY
          r.rolcanlogin,
          r.rolsuper,
          r.rolcreatedb,
          r.rolcreaterole
      `,
      [readerRole],
    );

    if (roleResult.rowCount === 0) {
      console.log(
        JSON.stringify({ roleExists: false, role: readerRole }, null, 2),
      );
    } else {
      const privilegeResult = await client.query(
        `
          SELECT
            table_name,
            has_table_privilege(
              $1,
              FORMAT('public.%I', table_name),
              'SELECT'
            ) AS can_select
          FROM UNNEST($2::text[]) AS table_name
          ORDER BY table_name
        `,
        [readerRole, expectedTables],
      );

      console.log(
        JSON.stringify(
          {
            roleExists: true,
            role: readerRole,
            ...roleResult.rows[0],
            selectPrivilegesComplete: privilegeResult.rows.every(
              (row) => row.can_select,
            ),
          },
          null,
          2,
        ),
      );
    }

    await client.query("ROLLBACK");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
