const API_VERSION = "/api/v1";

/**
 * Centralized API endpoint configuration.
 * Keep every client-side route here so API versioning and route changes have one owner.
 */
export const API_ENDPOINTS = {
  SERVERS: {
    BASE: `${API_VERSION}/servers`,
    BY_ID: (id: string) => `${API_VERSION}/servers/${id}`,
    DEPLOYED_APPS: (id: string) => `${API_VERSION}/infrastructure/servers/${id}/deployed-apps`,
    PURGE: (id: string) => `${API_VERSION}/infrastructure/servers/${id}/purge`,
    EXPORT: `${API_VERSION}/servers/export`,
  },
  APPLICATIONS: {
    BASE: `${API_VERSION}/applications`,
    BY_ID: (id: string) => `${API_VERSION}/applications/${id}`,
    DEPENDENCIES_COUNT: (id: string) => `${API_VERSION}/infrastructure/apps/${id}/dependencies-count`,
    MIGRATE: `${API_VERSION}/infrastructure/apps/migrate`,
    PURGE: (id: string) => `${API_VERSION}/infrastructure/apps/${id}/purge`,
    EXPORT: `${API_VERSION}/applications/export`,
  },
  DATACENTERS: {
    BASE: `${API_VERSION}/datacenters`,
  },
  SEARCH: {
    BASE: `${API_VERSION}/search`,
  },
  TOPOLOGY: {
    TREE: `${API_VERSION}/topology/tree`,
    MAP: `${API_VERSION}/topology/map`,
    STATUS: `${API_VERSION}/topology/status`,
    EXTERNAL_DEPENDENCIES: (serverId: string) =>
      `${API_VERSION}/topology/nodes/${serverId}/external-dependencies`,
    SYNC: `${API_VERSION}/topology/sync`,
  },
  ANALYTICS: {
    DEPENDENCIES: `${API_VERSION}/analytics/dependencies`,
  },
  DEPENDENCIES: {
    SYNC: `${API_VERSION}/dependencies/sync`,
  },
  INVENTORY: {
    IMPORT_TEMPLATE: `${API_VERSION}/inventory/import-template`,
    BULK_IMPORT: `${API_VERSION}/inventory/bulk-import`,
    LABELS: `${API_VERSION}/inventory/labels`,
  },
  FRAMES: {
    BASE: `${API_VERSION}/frames`,
    BY_ID: (id: string) => `${API_VERSION}/frames/${id}`,
  },
  AUTH: {
    LOGIN: `${API_VERSION}/auth/login`,
    REGISTER: `${API_VERSION}/auth/register`,
  },
};
