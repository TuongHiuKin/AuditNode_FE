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
 * Falls back to decoding localStorage accessToken for backend login gateway flow.
 * Safe when token is null, undefined, or user is not logged in.
 */
export const getUserRoles = (): string[] => {
  let tokenParsed = keycloak?.tokenParsed;

  if (!tokenParsed && typeof window !== "undefined") {
    const localToken = localStorage.getItem("accessToken");
    if (localToken) {
      try {
        const base64Url = localToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        tokenParsed = JSON.parse(jsonPayload);
      } catch (e) {
        // ignore invalid token in localStorage
      }
    }
  }

  if (!tokenParsed) {
    return [];
  }
  const realmRoles: string[] = tokenParsed?.realm_access?.roles || [];
  const clientRoles: string[] = Object.values(tokenParsed?.resource_access || {})
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
