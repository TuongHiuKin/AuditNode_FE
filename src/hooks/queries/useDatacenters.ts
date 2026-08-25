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
      const response = await apiClient.get<Schemas["DatacenterDto"][]>("/api/v1/datacenters");
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!selectedWorkspaceId,
  });
}
