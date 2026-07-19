import {
  Pool,
  type PoolClient,
  type PoolConfig,
  type QueryResultRow,
} from "pg";
import { assertReadOnlySql } from "./queryGuard.js";

export interface ReadOnlyResult<T extends QueryResultRow> {
  rows: T[];
  rowCount: number;
  truncated: boolean;
}

export class ReadOnlyDatabase {
  private readonly pool: Pool;

  public constructor(
    poolConfig: PoolConfig,
    private readonly queryTimeoutMs: number,
    private readonly maxRows: number,
  ) {
    this.pool = new Pool({
      ...poolConfig,
      application_name: "auditnode-db-mcp",
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  public async query<T extends QueryResultRow>(
    sql: string,
    values: readonly unknown[] = [],
  ): Promise<ReadOnlyResult<T>> {
    assertReadOnlySql(sql);

    const client = await this.pool.connect();
    try {
      await this.beginReadOnlyTransaction(client);
      const result = await client.query<T>(sql, [...values]);
      await client.query("COMMIT");

      const truncated = result.rows.length > this.maxRows;
      const rows = truncated
        ? result.rows.slice(0, this.maxRows)
        : result.rows;

      return {
        rows,
        rowCount: rows.length,
        truncated,
      };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  private async beginReadOnlyTransaction(client: PoolClient): Promise<void> {
    await client.query("BEGIN READ ONLY");
    await client.query(
      "SELECT set_config('statement_timeout', $1, true)",
      [`${this.queryTimeoutMs}ms`],
    );
    await client.query(
      "SELECT set_config('idle_in_transaction_session_timeout', $1, true)",
      [`${this.queryTimeoutMs + 1_000}ms`],
    );
  }
}
