import { createContext, useContext, useMemo, useState } from "react";
import { emptyCatalogFilters, type CatalogFilters, type CatalogView } from "./types";

interface CatalogAccessValue {
  principalId: string;
  view: CatalogView;
  sharedEnabled: boolean;
  filters: CatalogFilters;
  selectView: (view: CatalogView) => void;
  setFilters: (filters: Partial<CatalogFilters>) => void;
  resetFilters: () => void;
}

const fallbackCatalogAccess: CatalogAccessValue = {
  principalId: "anonymous",
  view: "mine",
  sharedEnabled: false,
  filters: emptyCatalogFilters,
  selectView: () => undefined,
  setFilters: () => undefined,
  resetFilters: () => undefined,
};

// The application root always supplies the provider. The conservative Mine-only
// fallback keeps isolated components and migration-era tests fail-closed.
const CatalogAccessContext = createContext<CatalogAccessValue>(fallbackCatalogAccess);

export function catalogQueryKey(scope: string, principalId: string, view: CatalogView, filters: CatalogFilters) {
  return ["catalog", principalId, scope, view, filters.ownerUserId ?? "all-owners", filters.labelKey ?? "all-label-keys", filters.labelValue ?? "all-label-values"] as const;
}

export function CatalogAccessProvider({
  children,
  initialView = "mine",
  initialFilters = emptyCatalogFilters,
  principalId = "anonymous",
}: {
  children: React.ReactNode;
  initialView?: CatalogView;
  initialFilters?: CatalogFilters;
  principalId?: string;
}) {
  const [view, setView] = useState<CatalogView>(initialView);
  const [sharedEnabled, setSharedEnabled] = useState(initialView === "shared");
  const [filters, setFilterState] = useState<CatalogFilters>(initialFilters);

  const value = useMemo<CatalogAccessValue>(() => ({
    principalId,
    view,
    sharedEnabled,
    filters,
    selectView(nextView) {
      if (nextView === "shared") setSharedEnabled(true);
      if (nextView !== view) setFilterState(emptyCatalogFilters);
      setView(nextView);
    },
    setFilters(next) { setFilterState((current) => ({ ...current, ...next })); },
    resetFilters() { setFilterState(emptyCatalogFilters); },
  }), [filters, principalId, sharedEnabled, view]);

  return <CatalogAccessContext.Provider value={value}>{children}</CatalogAccessContext.Provider>;
}

export function useCatalogAccess() {
  return useContext(CatalogAccessContext);
}
