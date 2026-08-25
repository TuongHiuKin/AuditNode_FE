import { describe, expect, it } from "vitest";
import { mapAdminUser } from "./adminUsers";

describe("mapAdminUser", () => {
  it("normalizes OpenAPI integer strings", () => {
    expect(mapAdminUser({ id: "user-1", username: "owner", email: null, enabled: true, workspaceCount: "2", isSystemAdmin: false }).workspaceCount).toBe(2);
  });

  it("rejects invalid workspace counts", () => {
    expect(() => mapAdminUser({ id: "user-1", username: "owner", email: null, enabled: true, workspaceCount: "NaN", isSystemAdmin: false })).toThrow(/workspace count/i);
  });
});
