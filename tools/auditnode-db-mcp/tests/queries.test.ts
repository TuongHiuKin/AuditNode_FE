import { describe, expect, it } from "vitest";
import {
  QUERY_DEFINITIONS,
  SCHEMA_TABLES,
  TOOL_NAMES,
} from "../src/queries.js";
import { assertReadOnlySql } from "../src/queryGuard.js";

describe("AuditNode query catalog", () => {
  it("exposes exactly the seven approved aggregate tools", () => {
    expect(TOOL_NAMES).toEqual([
      "get_schema_summary",
      "get_inventory_counts",
      "get_label_usage",
      "get_label_overlap",
      "get_server_app_density_by_label",
      "get_dependency_label_stats",
      "get_unused_label_stats",
    ]);
    expect(Object.keys(QUERY_DEFINITIONS)).toHaveLength(7);
  });

  it("includes all nine AuditNode tables in schema metadata scope", () => {
    expect(SCHEMA_TABLES).toEqual([
      "labels",
      "server_labels",
      "application_labels",
      "servers",
      "applications",
      "port_mappings",
      "app_dependencies",
      "boundary_frames",
      "datacenters",
    ]);
  });

  it("contains only SQL accepted by the read-only guard", () => {
    for (const definition of Object.values(QUERY_DEFINITIONS)) {
      expect(() => assertReadOnlySql(definition.sql)).not.toThrow();
    }
  });

  it("owner-scopes every business-data query", () => {
    for (const [name, definition] of Object.entries(QUERY_DEFINITIONS)) {
      if (name === "get_schema_summary") {
        expect(definition.ownerScoped).toBe(false);
        expect(definition.sql).toContain("information_schema.columns");
        continue;
      }

      expect(definition.ownerScoped).toBe(true);
      expect(definition.sql).toMatch(/owner_id\s*=\s*\$1/i);
    }
  });

  it("uses a positional row limit for every list query", () => {
    for (const definition of Object.values(QUERY_DEFINITIONS)) {
      if (definition.usesLimit) {
        expect(definition.sql).toMatch(/LIMIT\s+\$2/i);
      } else {
        expect(definition.sql).not.toMatch(/\bLIMIT\b/i);
      }
    }
  });
});
