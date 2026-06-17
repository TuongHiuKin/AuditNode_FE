import apiClient, { Schemas } from "../shared/api/client";
import { API_ENDPOINTS } from "../config/endpoints";

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
    const rawResponse = response as any;
    // Handle both direct array and wrapped response { data: [...] }
    const data = Array.isArray(rawResponse.data)
      ? rawResponse.data
      : rawResponse.data?.data || [];
    return data as Schemas["ServerResponseDto"][];
  },

  /**
   * Fetches deployed applications for a specific server.
   */
  async getDeployedApps(serverId: string): Promise<any[]> {
    const response = await apiClient.get(
      API_ENDPOINTS.SERVERS.DEPLOYED_APPS(serverId)
    );
    const rawResponse = response as any;
    return Array.isArray(rawResponse.data)
      ? rawResponse.data
      : rawResponse.data?.data || [];
  },

  /**
   * Exports specific servers by ID.
   */
  async exportServers(ids: string[]): Promise<any[]> {
    const response = await apiClient.get(API_ENDPOINTS.SERVERS.EXPORT, {
      params: { ids: ids.join(",") },
    });
    const rawResponse = response as any;
    return Array.isArray(rawResponse.data)
      ? rawResponse.data
      : rawResponse.data?.data || [];
  },

  /**
   * Purges a server and its dependencies.
   */
  async purgeServer(serverId: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.SERVERS.PURGE(serverId));
  },
};
