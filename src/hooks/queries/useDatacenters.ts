import { useQuery } from "@tanstack/react-query";
import apiClient, { Schemas } from "../../shared/api/client";

/**
 * Custom hook to fetch datacenters
 */
export function useDatacenters() {
  return useQuery({
    queryKey: ["datacenters"],
    queryFn: async () => {
      const response = await apiClient.get<Schemas["Datacenter"][]>("/api/v1/datacenters");
      const rawData = response as any;
      return (Array.isArray(rawData.data) ? rawData.data : (rawData.data?.data || [])) as Schemas["Datacenter"][];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
