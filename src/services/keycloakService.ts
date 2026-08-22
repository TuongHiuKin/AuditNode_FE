import { clearClientSession, getAccessToken, getAuthSnapshot } from "../shared/auth/authStore";

/** Compatibility helpers backed only by the AuditNode backend-gateway session. */
export const getToken = () => getAccessToken() ?? undefined;
export const getUsername = () => getAuthSnapshot().user?.username ?? "User";
export const getUserRoles = () => [...getAuthSnapshot().roles];
export const hasRole = (role: string) => getAuthSnapshot().roles.includes(role);
export const hasAnyRole = (roles: string[]) => roles.some(hasRole);
export const doLogout = () => clearClientSession();
