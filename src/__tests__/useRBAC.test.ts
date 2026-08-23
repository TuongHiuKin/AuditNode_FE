import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { setAuthenticatedSession } from "../shared/auth/authStore";
import { useRBAC } from "../shared/auth/useRBAC";

describe("useRBAC Hook", () => {
  beforeEach(() => setRoles([]));

  it("returns system permissions only for SystemAdmin", () => {
    setRoles(["SystemAdmin"]);
    const { result } = renderHook(() => useRBAC());
    expect(result.current).toMatchObject({
      isSystemAdmin: true, canManageSystem: true,
    });
  });

  it("does not treat workspace roles as system roles", () => {
    setRoles(["Auditor"]);
    const { result } = renderHook(() => useRBAC());
    expect(result.current).toMatchObject({
      isSystemAdmin: false, canManageSystem: false,
    });
  });

  it("does not elevate Viewer", () => {
    setRoles(["Viewer"]);
    const { result } = renderHook(() => useRBAC());
    expect(result.current).toMatchObject({
      isSystemAdmin: false, canManageSystem: false,
    });
  });

  it("handles empty roles safely", () => {
    const { result } = renderHook(() => useRBAC());
    expect(result.current.roles).toEqual([]);
    expect(result.current.isSystemAdmin).toBe(false);
  });
});

function setRoles(roles: string[]) {
  setAuthenticatedSession("memory-token", { id: "id", username: "user", roles });
}
