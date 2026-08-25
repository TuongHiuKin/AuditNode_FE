import { describe, expect, it } from "vitest";
import { mapWorkspaceShare } from "./workspaceSharing";

describe("mapWorkspaceShare", () => {
  it("normalizes a generated share response", () => {
    expect(mapWorkspaceShare({ userId: "user-1", role: "viewer", scopeMode: "labels", targetIds: ["label-1"], version: "3" })).toEqual({
      userId: "user-1", role: "viewer", scopeMode: "labels", targetIds: ["label-1"], version: 3,
    });
  });

  it.each([
    [{ userId: "user-1", role: "owner", scopeMode: "all", targetIds: [], version: 0 }, /role/i],
    [{ userId: "user-1", role: "viewer", scopeMode: "unknown", targetIds: [], version: 0 }, /scope/i],
    [{ userId: "user-1", role: "viewer", scopeMode: "all", targetIds: [], version: "stale" }, /version/i],
  ])("rejects invalid transported values", (dto, message) => {
    expect(() => mapWorkspaceShare(dto)).toThrow(message);
  });
});
