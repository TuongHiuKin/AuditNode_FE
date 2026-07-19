import type { QueryResultRow } from "pg";
import type { AuditNodeDbConfig } from "./config.js";
import { ReadOnlyDatabase, type ReadOnlyResult } from "./db.js";

export const TOOL_NAMES = [
  "get_schema_summary",
  "get_inventory_counts",
  "get_label_usage",
  "get_label_overlap",
  "get_server_app_density_by_label",
  "get_dependency_label_stats",
  "get_unused_label_stats",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export const TOOL_DESCRIPTIONS: Record<ToolName, string> = {
  get_schema_summary:
    "Return columns for the AuditNode tables used by dependency and label analysis. No row data is returned.",
  get_inventory_counts:
    "Return owner-scoped counts for labels, servers, applications, deployments, ports, and dependencies.",
  get_label_usage:
    "Return owner-scoped aggregate usage counts for each label across servers and applications.",
  get_label_overlap:
    "Return owner-scoped pairs of labels that occur on the same server or application.",
  get_server_app_density_by_label:
    "Return owner-scoped server and deployed-application density grouped by server label.",
  get_dependency_label_stats:
    "Return owner-scoped dependency counts grouped by source and destination application or server labels.",
  get_unused_label_stats:
    "Return owner-scoped labels that are not assigned to any server or application.",
};

export interface QueryResponse<T extends QueryResultRow = QueryResultRow>
  extends ReadOnlyResult<T> {
  tool: ToolName;
  ownerScoped: boolean;
}

export interface AuditNodeQueryService {
  execute(
    tool: ToolName,
    requestedLimit?: number,
  ): Promise<QueryResponse>;
  close(): Promise<void>;
}

interface QueryDefinition {
  sql: string;
  ownerScoped: boolean;
  usesLimit: boolean;
}

export const SCHEMA_TABLES = [
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

export const QUERY_DEFINITIONS: Record<ToolName, QueryDefinition> = {
  get_schema_summary: {
    ownerScoped: false,
    usesLimit: false,
    sql: `
      SELECT
        table_name,
        ordinal_position,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
      ORDER BY table_name, ordinal_position
    `,
  },
  get_inventory_counts: {
    ownerScoped: true,
    usesLimit: false,
    sql: `
      WITH
      owned_servers AS (
        SELECT id FROM servers WHERE owner_id = $1
      ),
      owned_apps AS (
        SELECT id FROM applications WHERE owner_id = $1
      )
      SELECT
        (SELECT COUNT(*)::int FROM labels WHERE owner_id = $1) AS label_count,
        (SELECT COUNT(*)::int FROM owned_servers) AS server_count,
        (SELECT COUNT(*)::int FROM owned_apps) AS application_count,
        (
          SELECT COUNT(*)::int
          FROM server_labels sl
          JOIN owned_servers os ON os.id = sl.server_id
          JOIN labels l ON l.id = sl.label_id AND l.owner_id = $1
        ) AS server_label_assignment_count,
        (
          SELECT COUNT(*)::int
          FROM application_labels al
          JOIN owned_apps oa ON oa.id = al.application_id
          JOIN labels l ON l.id = al.label_id AND l.owner_id = $1
        ) AS application_label_assignment_count,
        (
          SELECT COUNT(*)::int
          FROM port_mappings pm
          JOIN owned_servers os ON os.id = pm.server_id
          JOIN owned_apps oa ON oa.id = pm.app_id
        ) AS deployment_count,
        (
          SELECT COUNT(*)::int
          FROM app_dependencies ad
          JOIN owned_apps source_app ON source_app.id = ad.source_app_id
          JOIN owned_apps destination_app ON destination_app.id = ad.dest_app_id
        ) AS dependency_count
    `,
  },
  get_label_usage: {
    ownerScoped: true,
    usesLimit: true,
    sql: `
      WITH
      server_usage AS (
        SELECT
          sl.label_id,
          COUNT(DISTINCT sl.server_id)::int AS server_count
        FROM server_labels sl
        JOIN servers s ON s.id = sl.server_id AND s.owner_id = $1
        GROUP BY sl.label_id
      ),
      application_usage AS (
        SELECT
          al.label_id,
          COUNT(DISTINCT al.application_id)::int AS application_count
        FROM application_labels al
        JOIN applications a ON a.id = al.application_id AND a.owner_id = $1
        GROUP BY al.label_id
      )
      SELECT
        l.id AS label_id,
        l.key AS label_key,
        l.value AS label_value,
        l.color_hex,
        COALESCE(su.server_count, 0)::int AS server_count,
        COALESCE(au.application_count, 0)::int AS application_count,
        (
          COALESCE(su.server_count, 0) +
          COALESCE(au.application_count, 0)
        )::int AS total_entity_count
      FROM labels l
      LEFT JOIN server_usage su ON su.label_id = l.id
      LEFT JOIN application_usage au ON au.label_id = l.id
      WHERE l.owner_id = $1
      ORDER BY total_entity_count DESC, l.key, l.value, l.id
      LIMIT $2
    `,
  },
  get_label_overlap: {
    ownerScoped: true,
    usesLimit: true,
    sql: `
      WITH
      owner_labels AS (
        SELECT id, key, value
        FROM labels
        WHERE owner_id = $1
      ),
      server_pairs AS (
        SELECT
          'server'::text AS entity_type,
          left_label.id AS label_a_id,
          left_label.key AS label_a_key,
          left_label.value AS label_a_value,
          right_label.id AS label_b_id,
          right_label.key AS label_b_key,
          right_label.value AS label_b_value,
          COUNT(DISTINCT s.id)::int AS shared_entity_count
        FROM server_labels left_link
        JOIN server_labels right_link
          ON right_link.server_id = left_link.server_id
         AND right_link.label_id > left_link.label_id
        JOIN servers s
          ON s.id = left_link.server_id
         AND s.owner_id = $1
        JOIN owner_labels left_label ON left_label.id = left_link.label_id
        JOIN owner_labels right_label ON right_label.id = right_link.label_id
        GROUP BY
          left_label.id, left_label.key, left_label.value,
          right_label.id, right_label.key, right_label.value
      ),
      application_pairs AS (
        SELECT
          'application'::text AS entity_type,
          left_label.id AS label_a_id,
          left_label.key AS label_a_key,
          left_label.value AS label_a_value,
          right_label.id AS label_b_id,
          right_label.key AS label_b_key,
          right_label.value AS label_b_value,
          COUNT(DISTINCT a.id)::int AS shared_entity_count
        FROM application_labels left_link
        JOIN application_labels right_link
          ON right_link.application_id = left_link.application_id
         AND right_link.label_id > left_link.label_id
        JOIN applications a
          ON a.id = left_link.application_id
         AND a.owner_id = $1
        JOIN owner_labels left_label ON left_label.id = left_link.label_id
        JOIN owner_labels right_label ON right_label.id = right_link.label_id
        GROUP BY
          left_label.id, left_label.key, left_label.value,
          right_label.id, right_label.key, right_label.value
      )
      SELECT * FROM server_pairs
      UNION ALL
      SELECT * FROM application_pairs
      ORDER BY shared_entity_count DESC, entity_type, label_a_key, label_b_key
      LIMIT $2
    `,
  },
  get_server_app_density_by_label: {
    ownerScoped: true,
    usesLimit: true,
    sql: `
      WITH
      per_server AS (
        SELECT
          l.id AS label_id,
          l.key AS label_key,
          l.value AS label_value,
          s.id AS server_id,
          COUNT(DISTINCT a.id)::int AS application_count
        FROM labels l
        JOIN server_labels sl ON sl.label_id = l.id
        JOIN servers s
          ON s.id = sl.server_id
         AND s.owner_id = $1
        LEFT JOIN port_mappings pm ON pm.server_id = s.id
        LEFT JOIN applications a
          ON a.id = pm.app_id
         AND a.owner_id = $1
        WHERE l.owner_id = $1
        GROUP BY l.id, l.key, l.value, s.id
      )
      SELECT
        label_id,
        label_key,
        label_value,
        COUNT(*)::int AS server_count,
        SUM(application_count)::int AS application_deployment_count,
        COUNT(*) FILTER (WHERE application_count = 0)::int AS empty_server_count,
        ROUND(AVG(application_count)::numeric, 2) AS average_apps_per_server,
        MAX(application_count)::int AS max_apps_on_one_server
      FROM per_server
      GROUP BY label_id, label_key, label_value
      ORDER BY application_deployment_count DESC, server_count DESC, label_key, label_value
      LIMIT $2
    `,
  },
  get_dependency_label_stats: {
    ownerScoped: true,
    usesLimit: true,
    sql: `
      WITH
      owned_dependencies AS (
        SELECT ad.id, ad.source_app_id, ad.dest_app_id, ad.dest_port_id
        FROM app_dependencies ad
        JOIN applications source_app
          ON source_app.id = ad.source_app_id
         AND source_app.owner_id = $1
        JOIN applications destination_app
          ON destination_app.id = ad.dest_app_id
         AND destination_app.owner_id = $1
      ),
      application_label_pairs AS (
        SELECT
          'application_label'::text AS label_dimension,
          COALESCE(source_label.key, '(unlabeled)') AS source_label_key,
          COALESCE(source_label.value, '(unlabeled)') AS source_label_value,
          COALESCE(destination_label.key, '(unlabeled)') AS destination_label_key,
          COALESCE(destination_label.value, '(unlabeled)') AS destination_label_value,
          COUNT(DISTINCT dependency.id)::int AS dependency_count
        FROM owned_dependencies dependency
        LEFT JOIN application_labels source_link
          ON source_link.application_id = dependency.source_app_id
        LEFT JOIN labels source_label
          ON source_label.id = source_link.label_id
         AND source_label.owner_id = $1
        LEFT JOIN application_labels destination_link
          ON destination_link.application_id = dependency.dest_app_id
        LEFT JOIN labels destination_label
          ON destination_label.id = destination_link.label_id
         AND destination_label.owner_id = $1
        GROUP BY
          source_label.key, source_label.value,
          destination_label.key, destination_label.value
      ),
      server_label_pairs AS (
        SELECT
          'server_label'::text AS label_dimension,
          COALESCE(source_label.key, '(unlabeled)') AS source_label_key,
          COALESCE(source_label.value, '(unlabeled)') AS source_label_value,
          COALESCE(destination_label.key, '(unlabeled)') AS destination_label_key,
          COALESCE(destination_label.value, '(unlabeled)') AS destination_label_value,
          COUNT(DISTINCT dependency.id)::int AS dependency_count
        FROM owned_dependencies dependency
        JOIN port_mappings source_deployment
          ON source_deployment.app_id = dependency.source_app_id
        JOIN servers source_server
          ON source_server.id = source_deployment.server_id
         AND source_server.owner_id = $1
        JOIN port_mappings destination_port
          ON destination_port.id = dependency.dest_port_id
         AND destination_port.app_id = dependency.dest_app_id
        JOIN servers destination_server
          ON destination_server.id = destination_port.server_id
         AND destination_server.owner_id = $1
        LEFT JOIN server_labels source_link
          ON source_link.server_id = source_server.id
        LEFT JOIN labels source_label
          ON source_label.id = source_link.label_id
         AND source_label.owner_id = $1
        LEFT JOIN server_labels destination_link
          ON destination_link.server_id = destination_server.id
        LEFT JOIN labels destination_label
          ON destination_label.id = destination_link.label_id
         AND destination_label.owner_id = $1
        GROUP BY
          source_label.key, source_label.value,
          destination_label.key, destination_label.value
      )
      SELECT * FROM application_label_pairs
      UNION ALL
      SELECT * FROM server_label_pairs
      ORDER BY dependency_count DESC, label_dimension, source_label_key, destination_label_key
      LIMIT $2
    `,
  },
  get_unused_label_stats: {
    ownerScoped: true,
    usesLimit: true,
    sql: `
      SELECT
        l.id AS label_id,
        l.key AS label_key,
        l.value AS label_value,
        l.color_hex
      FROM labels l
      WHERE l.owner_id = $1
        AND NOT EXISTS (
          SELECT 1
          FROM server_labels sl
          JOIN servers s
            ON s.id = sl.server_id
           AND s.owner_id = $1
          WHERE sl.label_id = l.id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM application_labels al
          JOIN applications a
            ON a.id = al.application_id
           AND a.owner_id = $1
          WHERE al.label_id = l.id
        )
      ORDER BY l.key, l.value, l.id
      LIMIT $2
    `,
  },
};

export class PgAuditNodeQueryService implements AuditNodeQueryService {
  private readonly database: ReadOnlyDatabase;

  public constructor(private readonly config: AuditNodeDbConfig) {
    this.database = new ReadOnlyDatabase(
      config.database,
      config.queryTimeoutMs,
      config.maxRows,
    );
  }

  public async execute(
    tool: ToolName,
    requestedLimit?: number,
  ): Promise<QueryResponse> {
    const definition = QUERY_DEFINITIONS[tool];
    const limit = Math.min(
      requestedLimit ?? this.config.maxRows,
      this.config.maxRows,
    );

    const values = definition.ownerScoped
      ? definition.usesLimit
        ? [this.config.ownerId, limit + 1]
        : [this.config.ownerId]
      : [SCHEMA_TABLES];

    const result = await this.database.query(
      definition.sql,
      values,
    );

    const rows = result.rows.slice(0, limit);

    return {
      tool,
      ownerScoped: definition.ownerScoped,
      rows,
      rowCount: rows.length,
      truncated: result.truncated || result.rows.length > limit,
    };
  }

  public async close(): Promise<void> {
    await this.database.close();
  }
}
