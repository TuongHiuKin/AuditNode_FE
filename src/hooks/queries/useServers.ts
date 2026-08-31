import { useCatalogPages } from "../../features/catalog/api/useCatalogPages";
/**
 * Custom hook to fetch servers
 */
export function useServers() {
  const query = useCatalogPages("servers");
  return { ...query, data: query.items };
}
