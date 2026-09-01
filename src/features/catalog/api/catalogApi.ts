import apiClient from "../../../shared/api/client";
import type { CatalogApplication, CatalogDatacenter, CatalogLabel, CatalogPage, CatalogServer, CatalogView } from "../../../shared/catalog/types";

export type CatalogResource = "servers" | "applications" | "datacenters" | "labels";
export type { CatalogApplication, CatalogDatacenter, CatalogServer } from "../../../shared/catalog/types";

export interface CatalogPageRequest {
  view: CatalogView;
  cursor?: string | null;
  limit?: number;
  ownerUserId?: string | null;
  labelKey?: string | null;
  labelValue?: string | null;
}

export type CatalogResourceType<T extends CatalogResource> =
  T extends "servers" ? CatalogServer :
  T extends "applications" ? CatalogApplication :
  T extends "datacenters" ? CatalogDatacenter : CatalogLabel;

export async function fetchCatalogPage<T extends CatalogResource>(resource: T, request: CatalogPageRequest) {
  const supportsLabelFilter = resource !== "datacenters";
  const response = await apiClient.get<CatalogPage<CatalogResourceType<T>>>(`/api/v1/${resource}`, {
    params: {
      view: request.view,
      limit: request.limit ?? 25,
      cursor: request.cursor || undefined,
      ownerUserId: request.ownerUserId || undefined,
      ...(supportsLabelFilter ? {
        labelKey: request.labelKey || undefined,
        labelValue: request.labelValue || undefined,
      } : {}),
    },
    catalogRequest: true,
    catalogView: request.view,
  });
  if (Array.isArray(response.data)) {
    return { items: response.data, nextCursor: null, hasNextPage: false };
  }
  return response.data;
}
