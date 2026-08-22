import { useAuth } from "./AuthContext";

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
 * Custom hook providing RBAC permission flags from the backend-gateway auth context.
 */
export function useRBAC(): RBACState {
  const { roles } = useAuth();
  const hasRole = (role: string) => roles.includes(role);
  const isAdmin = hasRole("Admin");
  const isAuditor = hasRole("Auditor");
  const canEditInventory = isAdmin || isAuditor;
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
