import { useQuery } from "@tanstack/react-query";
import { ServerService } from "../../services/serverService";
import { useWorkspaceStore } from "../../app/hooks/useWorkspaceStore";

/**
 * Custom hook to fetch servers with workspace context.
 * Integrates with useWorkspaceStore for cache keying and enabling/disabling.
 */
export function useServers() {
  const { activeWorkspace } = useWorkspaceStore();

  return useQuery({
    queryKey: ["servers", activeWorkspace?.id],
    queryFn: () => ServerService.getServers(),
    enabled: !!activeWorkspace?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
