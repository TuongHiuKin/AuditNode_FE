import Keycloak from "keycloak-js";
import { RUNTIME_CONFIG } from "../config/runtime";

const keycloakConfig = {
  url: RUNTIME_CONFIG.keycloak.url,
  realm: RUNTIME_CONFIG.keycloak.realm,
  clientId: RUNTIME_CONFIG.keycloak.clientId,
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

export default keycloak;
