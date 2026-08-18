import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { setAuthenticatedSession } from "../shared/auth/authStore";
import { useRBAC } from "../shared/auth/useRBAC";

describe("useRBAC Hook", () => {
  beforeEach(() => setRoles([]));

  it("returns Admin permissions when user has Admin role", () => {
    setRoles(["Admin"]);
    const { result } = renderHook(() => useRBAC());
    expect(result.current).toMatchObject({
      isAdmin: true, isAuditor: false, isViewer: false,
      canEditInventory: true, canManageSystem: true, isReadOnly: false,
    });
  });

  it("returns Auditor permissions when user has Auditor role", () => {
    setRoles(["Auditor"]);
    const { result } = renderHook(() => useRBAC());
    expect(result.current).toMatchObject({
      isAdmin: false, isAuditor: true, isViewer: false,
      canEditInventory: true, canManageSystem: false, isReadOnly: false,
    });
  });

  it("returns Viewer permissions from context roles", () => {
    setRoles(["Viewer"]);
    const { result } = renderHook(() => useRBAC());
    expect(result.current).toMatchObject({
      isAdmin: false, isAuditor: false, isViewer: true,
      canEditInventory: false, canManageSystem: false, isReadOnly: true,
    });
  });

  it("handles empty roles safely", () => {
    const { result } = renderHook(() => useRBAC());
    expect(result.current.roles).toEqual([]);
    expect(result.current.isReadOnly).toBe(true);
  });
});

function setRoles(roles: string[]) {
  setAuthenticatedSession("memory-token", { id: "id", username: "user", roles });
}
