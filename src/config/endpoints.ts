/**
 * Centralized API endpoint configuration.
 * Enforces /api/v1/ prefix and lowercase naming conventions.
 */
export const API_ENDPOINTS = {
  SERVERS: {
    BASE: "/api/v1/servers",
    BY_ID: (id: string) => `/api/v1/servers/${id}`,
    DEPLOYED_APPS: (id: string) => `/api/v1/infrastructure/servers/${id}/deployed-apps`,
    EXPORT: "/api/v1/servers/export",
  },
  APPLICATIONS: {
    BASE: "/api/v1/applications",
    BY_ID: (id: string) => `/api/v1/applications/${id}`,
    DEPENDENCIES_COUNT: (id: string) => `/api/v1/infrastructure/apps/${id}/dependencies-count`,
    MIGRATE: "/api/v1/infrastructure/apps/migrate",
    PURGE: (id: string) => `/api/v1/infrastructure/apps/${id}/purge`,
    EXPORT: "/api/v1/applications/export",
  },
  DATACENTERS: {
    BASE: "/api/v1/datacenters",
  },
  SEARCH: {
    BASE: "/api/v1/search",
  },
  TOPOLOGY: {
    TREE: "/api/v1/topology/tree",
    MAP: "/api/v1/topology/map",
    STATUS: "/api/v1/topology/status",
  },
  ANALYTICS: {
    DEPENDENCIES: "/api/v1/analytics/dependencies",
  },
  DEPENDENCIES: {
    SYNC: "/api/v1/dependencies/sync",
  },
  INVENTORY: {
    IMPORT_TEMPLATE: "/api/v1/inventory/import-template",
    IMPORT: "/api/v1/inventory/import",
  },
};
