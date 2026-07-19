const DEFAULT_RUNTIME_CONFIG = {
  apiBaseUrl: "https://localhost:7126",
  keycloakUrl: "http://localhost:8080",
  keycloakRealm: "AuditNode-Realm",
  keycloakClientId: "audit-frontend",
} as const;

const withoutTrailingSlash = (value: string | undefined) => value?.replace(/\/+$/, "");

/**
 * Deployment-specific values. Configure them through Vite environment variables;
 * the application code must not own host names or identity-provider settings.
 */
export const RUNTIME_CONFIG = {
  apiBaseUrl: withoutTrailingSlash(import.meta.env.VITE_API_BASE_URL) ?? DEFAULT_RUNTIME_CONFIG.apiBaseUrl,
  keycloak: {
    url: withoutTrailingSlash(import.meta.env.VITE_KEYCLOAK_URL) ?? DEFAULT_RUNTIME_CONFIG.keycloakUrl,
    realm: import.meta.env.VITE_KEYCLOAK_REALM ?? DEFAULT_RUNTIME_CONFIG.keycloakRealm,
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? DEFAULT_RUNTIME_CONFIG.keycloakClientId,
  },
} as const;
