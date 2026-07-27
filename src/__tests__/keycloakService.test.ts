import { describe, it, expect, vi, beforeEach } from "vitest";

vi.unmock("../services/keycloakService");
import keycloak, { getUserRoles, hasRole, hasAnyRole } from "../services/keycloakService";

describe("keycloakService RBAC utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getUserRoles extracts roles from both realm_access and resource_access", () => {
    keycloak.tokenParsed = {
      realm_access: { roles: ["Admin", "user"] },
      resource_access: {
        "audit-frontend": { roles: ["Auditor"] },
      },
    } as any;

    const roles = getUserRoles();
    expect(roles).toContain("Admin");
    expect(roles).toContain("user");
    expect(roles).toContain("Auditor");
  });

  it("getUserRoles returns empty array when tokenParsed is undefined", () => {
    keycloak.tokenParsed = undefined;
    expect(getUserRoles()).toEqual([]);
  });

  it("hasRole returns true if role exists", () => {
    keycloak.tokenParsed = {
      realm_access: { roles: ["Auditor"] },
    } as any;
    expect(hasRole("Auditor")).toBe(true);
    expect(hasRole("Admin")).toBe(false);
  });

  it("hasAnyRole returns true if any role matches", () => {
    keycloak.tokenParsed = {
      realm_access: { roles: ["Auditor"] },
    } as any;
    expect(hasAnyRole(["Admin", "Auditor"])).toBe(true);
    expect(hasAnyRole(["Admin", "Viewer"])).toBe(false);
  });
});
