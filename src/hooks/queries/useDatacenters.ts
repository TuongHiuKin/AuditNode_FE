import { useQuery } from "@tanstack/react-query";
import apiClient, { Schemas } from "../../shared/api/client";
import { API_ENDPOINTS } from "../../config/endpoints";

/**
 * Custom hook to fetch datacenters
 */
export function useDatacenters() {
  return useQuery({
    queryKey: ["datacenters"],
    queryFn: async () => {
      const response = await apiClient.get<Schemas["DatacenterDto"][]>(API_ENDPOINTS.DATACENTERS.BASE);
      const rawData = response as any;
      return (Array.isArray(rawData.data) ? rawData.data : (rawData.data?.data || [])) as Schemas["DatacenterDto"][];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
