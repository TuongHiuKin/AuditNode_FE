import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRBAC } from "../shared/auth/useRBAC";
import * as keycloakService from "../services/keycloakService";

vi.mock("../services/keycloakService", () => ({
  getUserRoles: vi.fn(),
  hasRole: vi.fn(),
  hasAnyRole: vi.fn(),
}));

describe("useRBAC Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns Admin permissions when user has Admin role", () => {
    vi.mocked(keycloakService.getUserRoles).mockReturnValue(["Admin"]);
    vi.mocked(keycloakService.hasRole).mockImplementation((role) => role === "Admin");
    vi.mocked(keycloakService.hasAnyRole).mockImplementation((roles) => roles.includes("Admin"));

    const { result } = renderHook(() => useRBAC());

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isAuditor).toBe(false);
    expect(result.current.isViewer).toBe(false);
    expect(result.current.canEditInventory).toBe(true);
    expect(result.current.canManageSystem).toBe(true);
    expect(result.current.isReadOnly).toBe(false);
    expect(result.current.roles).toEqual(["Admin"]);
  });

  it("returns Auditor permissions when user has Auditor role", () => {
    vi.mocked(keycloakService.getUserRoles).mockReturnValue(["Auditor"]);
    vi.mocked(keycloakService.hasRole).mockImplementation((role) => role === "Auditor");
    vi.mocked(keycloakService.hasAnyRole).mockImplementation((roles) => roles.includes("Auditor"));

    const { result } = renderHook(() => useRBAC());

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isAuditor).toBe(true);
    expect(result.current.isViewer).toBe(false);
    expect(result.current.canEditInventory).toBe(true);
    expect(result.current.canManageSystem).toBe(false);
    expect(result.current.isReadOnly).toBe(false);
  });

  it("returns Viewer / Read-Only permissions when user has Viewer role or no admin/auditor role", () => {
    vi.mocked(keycloakService.getUserRoles).mockReturnValue(["Viewer"]);
    vi.mocked(keycloakService.hasRole).mockImplementation((role) => role === "Viewer");
    vi.mocked(keycloakService.hasAnyRole).mockReturnValue(false);

    const { result } = renderHook(() => useRBAC());

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isAuditor).toBe(false);
    expect(result.current.isViewer).toBe(true);
    expect(result.current.canEditInventory).toBe(false);
    expect(result.current.canManageSystem).toBe(false);
    expect(result.current.isReadOnly).toBe(true);
  });

  it("handles empty roles safely without errors", () => {
    vi.mocked(keycloakService.getUserRoles).mockReturnValue([]);
    vi.mocked(keycloakService.hasRole).mockReturnValue(false);
    vi.mocked(keycloakService.hasAnyRole).mockReturnValue(false);

    const { result } = renderHook(() => useRBAC());

    expect(result.current.canEditInventory).toBe(false);
    expect(result.current.canManageSystem).toBe(false);
    expect(result.current.isReadOnly).toBe(true);
    expect(result.current.isViewer).toBe(true);
    expect(result.current.roles).toEqual([]);
  });
});
