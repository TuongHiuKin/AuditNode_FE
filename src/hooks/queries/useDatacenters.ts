import { useQuery } from "@tanstack/react-query";
import apiClient, { Schemas } from "../../shared/api/client";
import { useWorkspace } from "../../shared/workspace/WorkspaceContext";
import { tenantQueryKey } from "../../shared/workspace/workspaceStore";

/**
 * Custom hook to fetch datacenters
 */
export function useDatacenters() {
  const { selectedWorkspaceId } = useWorkspace();
  return useQuery({
    queryKey: tenantQueryKey("datacenters", selectedWorkspaceId),
    queryFn: async () => {
      const response = await apiClient.get<Schemas["Datacenter"][]>("/api/v1/datacenters");
      const rawData = response as any;
      return (Array.isArray(rawData.data) ? rawData.data : (rawData.data?.data || [])) as Schemas["Datacenter"][];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!selectedWorkspaceId,
  });
}
