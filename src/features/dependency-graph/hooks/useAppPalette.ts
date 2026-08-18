import { useQuery } from "@tanstack/react-query";
import { ApplicationService } from "../../../services/applicationService";
import { useWorkspace } from "../../../shared/workspace/WorkspaceContext";
import { tenantQueryKey } from "../../../shared/workspace/workspaceStore";
import type { PaletteApp } from "../types";

export function useAppPalette() {
  const { selectedWorkspaceId } = useWorkspace();
  const { data: availableApps = [], isLoading, refetch } = useQuery<PaletteApp[]>({
    queryKey: tenantQueryKey("dependency-palette", selectedWorkspaceId),
    queryFn: async () => {
      const applications = await ApplicationService.getApplications();
      return applications.flatMap((application) => application.servers
        .filter((deployment) => Boolean(deployment.portMappingId))
        .map((deployment) => ({
          id: deployment.portMappingId,
          appId: application.id,
          serverId: deployment.id,
          portMappingId: deployment.portMappingId,
          appName: application.appName,
          ownerId: application.ownerTeam,
          portNumber: deployment.portNumber,
          protocol: deployment.protocol,
          icon: application.icon,
          techStack: application.techStack,
          risk: application.risk,
          isMapped: false,
        })));
    },
    enabled: Boolean(selectedWorkspaceId),
  });

  return { availableApps, isLoading, refetch };
}
