import type { PaletteApp } from "@/features/dependency-graph/types";
import { useCatalogPages } from "@/features/catalog/api/useCatalogPages";
import type { CatalogApplication } from "@/features/catalog/api/catalogApi";

type CatalogDeployment = NonNullable<CatalogApplication["servers"]>[number];

export function useAppPalette() {
  const applications = useCatalogPages("applications");
  const availableApps: PaletteApp[] = applications.items.flatMap((application) => (application.servers ?? [])
    .filter((deployment: CatalogDeployment) => Boolean(deployment.portMappingId))
    .map((deployment: CatalogDeployment) => ({
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

  return { availableApps, isLoading: applications.isLoading, refetch: applications.refetch };
}
