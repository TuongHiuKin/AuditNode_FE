import { useCatalogAccess } from "../../../shared/catalog/CatalogAccessContext";

export function MineSharedSwitch() {
  const { view, selectView } = useCatalogAccess();
  return (
    <div className="flex rounded-lg border border-border bg-surface p-1" role="group" aria-label="Catalog view">
      <button type="button" aria-pressed={view === "mine"} aria-label="My catalog" onClick={() => selectView("mine")}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${view === "mine" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
        My catalog
      </button>
      <button type="button" aria-pressed={view === "shared"} aria-label="Shared with me" onClick={() => selectView("shared")}
        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${view === "shared" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
        Shared with me
      </button>
    </div>
  );
}
