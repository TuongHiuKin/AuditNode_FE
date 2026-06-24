import { useQuery } from "@tanstack/react-query";
import { ServerService } from "../../services/serverService";
/**
 * Custom hook to fetch servers
 */
export function useServers() {
  return useQuery({
    queryKey: ["servers"],
    queryFn: () => ServerService.getServers(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
