import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../shared/api/client";
import { API_ENDPOINTS } from "../../../config/endpoints";
import { PaletteApp } from "../types";

export function useAppPalette() {
  const { data: allApps = [], isLoading, refetch } = useQuery<PaletteApp[]>({
    queryKey: ["topology-status"],
    queryFn: async () => {
      const response = await apiClient.get<PaletteApp[]>(API_ENDPOINTS.TOPOLOGY.STATUS);
      const rawResponse = response as any;
      // Handle potential wrapped response from common client patterns
      return Array.isArray(rawResponse.data) ? rawResponse.data : (rawResponse.data?.data || []);
    },
  });

  const availableApps = allApps.filter(app => !app.isMapped);

  return {
    availableApps,
    isLoading,
    refetch,
  };
}
