import { describe, expect, it } from "vitest";
import { mapWorkspaceSummary } from "./WorkspaceContext";

describe("mapWorkspaceSummary", () => {
  it("accepts a generated workspace response with validated UI unions", () => {
    const result = mapWorkspaceSummary({
      id: "00000000-0000-0000-0000-000000000001",
      name: "Personal",
      relationship: "owner",
      effectiveRole: "owner",
      scope: { mode: "all", labels: [], frames: [] },
      capabilities: { canManageShares: true, canWriteInventory: true, canEditGraph: true, canManageDatacenters: true, canManageLabels: true, canImport: true },
    });
    expect(result.scope?.mode).toBe("all");
    expect(result.effectiveRole).toBe("owner");
  });

  it("rejects unknown authorization values", () => {
    expect(() => mapWorkspaceSummary({ id: "workspace-1", name: "Workspace", effectiveRole: "super-owner" })).toThrow(/role/i);
  });
});
