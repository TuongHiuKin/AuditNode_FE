import Keycloak from "keycloak-js";

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8080",
  realm: import.meta.env.VITE_KEYCLOAK_REALM || "AuditNode-Realm",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "audit-frontend",
};

const keycloak = new Keycloak(keycloakConfig);

/**
 * Initializes Keycloak with OIDC standard flow and PKCE enabled.
 * onLoad: 'login-required' redirects to Keycloak login if not authenticated.
 */
export const initKeycloak = (onAuthenticatedCallback: () => void) => {
  keycloak
    .init({
      onLoad: "login-required",
      pkceMethod: "S256",
    })
    .then((authenticated) => {
      if (authenticated) {
        onAuthenticatedCallback();
      } else {
        window.location.reload();
      }
    })
    .catch((err) => {
      console.error("Keycloak initialization failed:", err);
    });
};

export const doLogout = () => keycloak.logout();

export const getToken = () => keycloak.token;

export const updateToken = (minValidity: number = 30) => {
  return keycloak.updateToken(minValidity);
};

export const getUsername = () => keycloak.tokenParsed?.preferred_username || "User";

/**
 * Retrieves the user's roles from Keycloak token (checking both realm_access and resource_access).
 * Safe when token is null, undefined, or user is not logged in.
 */
export const getUserRoles = (): string[] => {
  if (!keycloak || !keycloak.tokenParsed) {
    return [];
  }
  const realmRoles: string[] = keycloak.tokenParsed?.realm_access?.roles || [];
  const clientRoles: string[] = Object.values(keycloak.tokenParsed?.resource_access || {})
    .flatMap((resource: any) => resource?.roles || []);
  return Array.from(new Set([...realmRoles, ...clientRoles]));
};

/**
 * Checks if the user has a specific role.
 */
export const hasRole = (role: string): boolean => {
  return getUserRoles().includes(role);
};

/**
 * Checks if the user has any role in the provided list of roles.
 */
export const hasAnyRole = (roles: string[]): boolean => {
  const userRoles = getUserRoles();
  return roles.some((role) => userRoles.includes(role));
};

export default keycloak;
