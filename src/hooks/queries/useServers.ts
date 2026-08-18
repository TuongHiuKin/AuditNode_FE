import { useQuery } from "@tanstack/react-query";
import { ServerService } from "../../services/serverService";
import { useWorkspace } from "../../shared/workspace/WorkspaceContext";
import { tenantQueryKey } from "../../shared/workspace/workspaceStore";
/**
 * Custom hook to fetch servers
 */
export function useServers() {
  const { selectedWorkspaceId } = useWorkspace();
  return useQuery({
    queryKey: tenantQueryKey("servers", selectedWorkspaceId),
    queryFn: () => ServerService.getServers(),
    enabled: !!selectedWorkspaceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
