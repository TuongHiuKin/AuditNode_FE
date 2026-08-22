import { useQuery } from "@tanstack/react-query";
import apiClient, { Schemas } from "../../shared/api/client";
import { useWorkspace } from "../../shared/workspace/WorkspaceContext";
import { tenantQueryKey } from "../../shared/workspace/workspaceStore";
import { LabelData } from "../../app/components/LabelBadge";

/**
 * Custom hook to fetch inventory labels scoped to the selected workspace.
 */
export function useLabels() {
  const { selectedWorkspaceId } = useWorkspace();
  return useQuery({
    queryKey: tenantQueryKey("labels", selectedWorkspaceId),
    queryFn: async () => {
      const response = await apiClient.get<Schemas["LabelDto"][]>("/api/v1/inventory/labels");
      const rawData = response as any;
      return (Array.isArray(rawData.data) ? rawData.data : (rawData.data?.data || [])) as LabelData[];
    },
    enabled: !!selectedWorkspaceId,
    staleTime: 1000 * 60, // 1 minute
  });
}
