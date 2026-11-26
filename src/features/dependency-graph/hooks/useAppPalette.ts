import { useQuery } from "@tanstack/react-query";
import type { PaletteApp, PaletteExternalService } from "@/features/dependency-graph/types";
import { useCatalogPages } from "@/features/catalog/api/useCatalogPages";
import type { CatalogApplication } from "@/features/catalog/api/catalogApi";
import { fetchExternalServices } from "@/features/external-services/api/externalServicesApi";

type CatalogDeployment = NonNullable<CatalogApplication["servers"]>[number];

/**
 * Sources for the dependency canvas: deployments the owner can drag in, plus the
 * third-party services they recorded. External services appear here so a dependency can
 * point outside the infrastructure, which is the whole reason the entity exists.
 */
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

  const externalServices = useQuery({
    queryKey: ["dependency-palette", "external-services"],
    queryFn: () => fetchExternalServices(),
  });

  const availableExternalServices: PaletteExternalService[] = (externalServices.data ?? []).map((service) => ({
    id: service.id,
    name: service.name,
    kind: service.kind,
    provider: service.provider,
    endpoint: service.endpoint,
    port: service.port,
    environment: service.environment,
    dependentApplicationCount: service.dependentApplicationCount,
  }));

  return {
    availableApps,
    availableExternalServices,
    isLoading: applications.isLoading || externalServices.isLoading,
    refetch: () => { void applications.refetch(); void externalServices.refetch(); },
  };
}
