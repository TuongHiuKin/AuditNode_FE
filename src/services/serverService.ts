import apiClient, { Schemas } from "../shared/api/client";
import { API_ENDPOINTS } from "../config/endpoints";
import { buildRepeatedIdParams, type ServerExportRecord } from "../shared/utils/inventoryExport";

export type ServerWritePayload = Omit<Schemas["CreateServerDto"], "ipAddress" | "labels"> & {
  ipAddress: string;
  labels?: Schemas["LabelDto"][] | null;
};

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (isRecord(payload) && Array.isArray(payload.data)) return payload.data as T[];
  return [];
}

function unwrapObject<T>(payload: unknown): T {
  const value = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  return value as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Service layer for Server-related API operations.
 */
export const ServerService = {
  /**
   * Fetches all registered servers.
   */
  async getServers(): Promise<Schemas["ServerResponseDto"][]> {
    const response = await apiClient.get<Schemas["ServerResponseDto"][]>(
      API_ENDPOINTS.SERVERS.BASE
    );
    return unwrapList<Schemas["ServerResponseDto"]>(response.data);
  },

  async getServer(serverId: string): Promise<Schemas["ServerResponseDto"]> {
    const response = await apiClient.get<Schemas["ServerResponseDto"]>(
      API_ENDPOINTS.SERVERS.BY_ID(serverId)
    );
    return unwrapObject<Schemas["ServerResponseDto"]>(response.data);
  },

  async createServer(payload: ServerWritePayload): Promise<void> {
    await apiClient.post(API_ENDPOINTS.SERVERS.BASE, payload);
  },

  async updateServer(serverId: string, payload: ServerWritePayload): Promise<void> {
    await apiClient.put(API_ENDPOINTS.SERVERS.BY_ID(serverId), payload);
  },

  async deleteServer(serverId: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.SERVERS.BY_ID(serverId));
  },

  /**
   * Fetches deployed applications for a specific server.
   */
  async getDeployedApps(serverId: string): Promise<Schemas["ApplicationOnServerDto"][]> {
    const response = await apiClient.get<Schemas["ApplicationOnServerDto"][]>(
      API_ENDPOINTS.SERVERS.DEPLOYED_APPS(serverId)
    );
    return unwrapList<Schemas["ApplicationOnServerDto"]>(response.data);
  },

  /**
   * Exports specific servers by ID.
   */
  async exportServers(ids: string[]): Promise<ServerExportRecord[]> {
    const response = await apiClient.get<ServerExportRecord[]>(API_ENDPOINTS.SERVERS.EXPORT, {
      params: buildRepeatedIdParams(ids),
    });
    return unwrapList<ServerExportRecord>(response.data);
  },

  /**
   * Purges a server and its dependencies.
   */
};
