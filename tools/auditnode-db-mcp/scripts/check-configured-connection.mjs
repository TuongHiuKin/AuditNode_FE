import { loadConfig } from "../dist/config.js";
import { PgAuditNodeQueryService } from "../dist/queries.js";

const config = loadConfig();

if (config.database.password === "PUT_READER_PASSWORD_HERE") {
  throw new Error(
    "Replace PUT_READER_PASSWORD_HERE in .env.local before testing.",
  );
}

if (config.ownerId === "PUT_OWNER_ID_HERE") {
  throw new Error("Replace PUT_OWNER_ID_HERE in .env.local before testing.");
}

const service = new PgAuditNodeQueryService(config);

try {
  const inventoryResult = await service.execute("get_inventory_counts");
  const schemaResult = await service.execute("get_schema_summary");
  const visibleSchemaTables = [
    ...new Set(schemaResult.rows.map((row) => row.table_name)),
  ].sort();

  console.log(
    JSON.stringify(
      {
        connection: "OK",
        inventoryTool: inventoryResult.tool,
        ownerScoped: inventoryResult.ownerScoped,
        aggregate: inventoryResult.rows[0] ?? {},
        schemaTool: schemaResult.tool,
        schemaTableCount: visibleSchemaTables.length,
        schemaTables: visibleSchemaTables,
      },
      null,
      2,
    ),
  );
} finally {
  await service.close();
}
