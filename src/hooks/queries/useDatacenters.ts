import { useCatalogPages } from "../../features/catalog/api/useCatalogPages";

/**
 * Custom hook to fetch datacenters
 */
export function useDatacenters() {
  const query = useCatalogPages("datacenters");
  return { ...query, data: query.items };
}
