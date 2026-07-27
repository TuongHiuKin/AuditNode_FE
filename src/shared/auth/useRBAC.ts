import { getUserRoles, hasRole, hasAnyRole } from "../../services/keycloakService";

export interface RBACState {
  isAdmin: boolean;
  isAuditor: boolean;
  isViewer: boolean;
  canEditInventory: boolean;
  canManageSystem: boolean;
  isReadOnly: boolean;
  roles: string[];
}

/**
 * Custom hook providing RBAC permission flags based on Keycloak token roles.
 */
export function useRBAC(): RBACState {
  const roles = getUserRoles();
  const isAdmin = hasRole("Admin");
  const isAuditor = hasRole("Auditor");
  const canEditInventory = hasAnyRole(["Admin", "Auditor"]);
  const canManageSystem = isAdmin;
  const isReadOnly = !canEditInventory;
  const isViewer = hasRole("Viewer") || (!isAdmin && !isAuditor);

  return {
    isAdmin,
    isAuditor,
    isViewer,
    canEditInventory,
    canManageSystem,
    isReadOnly,
    roles,
  };
}

export default useRBAC;
