import { beforeEach, describe, expect, it } from "vitest";
import { clearClientSession, setAuthenticatedSession } from "../shared/auth/authStore";
import { getToken, getUserRoles, getUsername, hasAnyRole, hasRole } from "../services/keycloakService";

describe("backend-gateway auth compatibility helpers", () => {
  beforeEach(() => clearClientSession());

  it("reads username, roles, and access token only from the in-memory auth store", () => {
    setAuthenticatedSession("memory-token", {
      id: "id",
      username: "auditor",
      roles: ["Auditor", "Viewer"],
    });

    expect(getToken()).toBe("memory-token");
    expect(getUsername()).toBe("auditor");
    expect(getUserRoles()).toEqual(["Auditor", "Viewer"]);
    expect(hasRole("Auditor")).toBe(true);
    expect(hasAnyRole(["Admin", "Viewer"])).toBe(true);
  });

  it("returns anonymous defaults without a session", () => {
    expect(getToken()).toBeUndefined();
    expect(getUsername()).toBe("User");
    expect(getUserRoles()).toEqual([]);
  });
});
