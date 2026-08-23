import { useAuth } from "./AuthContext";

export interface RBACState {
  isSystemAdmin: boolean;
  canManageSystem: boolean;
  roles: string[];
}

/**
 * Custom hook providing RBAC permission flags from the backend-gateway auth context.
 */
export function useRBAC(): RBACState {
  const { roles } = useAuth();
  const hasRole = (role: string) => roles.includes(role);
  const isSystemAdmin = hasRole("SystemAdmin");

  return {
    isSystemAdmin,
    canManageSystem: isSystemAdmin,
    roles,
  };
}

export default useRBAC;
