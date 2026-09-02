import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { catalogQueryKey, useCatalogAccess } from "../../../shared/catalog/CatalogAccessContext";
import { registerSharedCatalogInvalidator } from "../../../shared/catalog/catalogCache";
import { fetchCatalogPage, type CatalogResource } from "./catalogApi";

export function useCatalogPages<T extends CatalogResource>(
  resource: T,
  options: { ignoreOwnerFilter?: boolean; ignoreLabelFilter?: boolean } = {},
) {
  const access = useCatalogAccess();
  const queryClient = useQueryClient();
  const effectiveFilters = {
    ownerUserId: options.ignoreOwnerFilter ? null : access.filters.ownerUserId,
    labelKey: options.ignoreLabelFilter ? null : access.filters.labelKey,
    labelValue: options.ignoreLabelFilter ? null : access.filters.labelValue,
  };
  const key = catalogQueryKey(resource, access.principalId, access.view, effectiveFilters);
  const query = useInfiniteQuery({
    queryKey: key,
    enabled: access.view === "mine" || access.sharedEnabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchCatalogPage(resource, {
      view: access.view,
      cursor: pageParam,
      labelKey: effectiveFilters.labelKey,
      labelValue: effectiveFilters.labelValue,
      ownerUserId: effectiveFilters.ownerUserId,
    }),
    getNextPageParam: (page) => page.hasNextPage ? page.nextCursor : undefined,
  });

  useEffect(() => registerSharedCatalogInvalidator(() => {
    const sharedKey = ["catalog", access.principalId, resource, "shared"] as const;
    void queryClient.cancelQueries({ queryKey: sharedKey }).then(() => {
      queryClient.removeQueries({ queryKey: sharedKey });
    });
  }), [access.principalId, queryClient, resource]);

  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  return { ...query, items };
}
