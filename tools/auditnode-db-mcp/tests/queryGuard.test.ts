import { describe, expect, it } from "vitest";
import { assertReadOnlySql } from "../src/queryGuard.js";

describe("assertReadOnlySql", () => {
  it.each([
    "SELECT id FROM labels",
    "  select count(*) from servers",
    "WITH owned AS (SELECT id FROM applications) SELECT * FROM owned",
  ])("accepts a single read-only query: %s", (sql) => {
    expect(() => assertReadOnlySql(sql)).not.toThrow();
  });

  it.each([
    "INSERT INTO labels(id) VALUES (1)",
    "UPDATE labels SET value = 'changed'",
    "DELETE FROM labels",
    "DROP TABLE labels",
    "ALTER TABLE labels ADD COLUMN unsafe text",
    "TRUNCATE TABLE labels",
    "CREATE TABLE unsafe(id int)",
    "SELECT 1; SELECT 2",
    "SELECT 1 -- hidden statement",
    "WITH changed AS (DELETE FROM labels RETURNING id) SELECT * FROM changed",
  ])("rejects unsafe SQL: %s", (sql) => {
    expect(() => assertReadOnlySql(sql)).toThrow();
  });
});
