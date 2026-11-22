
import { useHeader } from "../hooks/useHeader";
import { useEffect, useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import { MineSharedSwitch } from "../../features/catalog/components/MineSharedSwitch";
import { ShareLabelModal } from "../../features/label-sharing/components/ShareLabelModal";
import { useCatalogPages } from "../../features/catalog/api/useCatalogPages";
import { useCatalogAccess } from "../../shared/catalog/CatalogAccessContext";

export function Topbar() {
  const { breadcrumbs } = useHeader();
  const [shareOpen, setShareOpen] = useState(false);
  const { view, filters, setFilters } = useCatalogAccess();
  const labels = useCatalogPages("labels", { ignoreOwnerFilter: true, ignoreLabelFilter: true });
  const manageableLabels = labels.items.filter((label) => label.capabilities.canManageGrants);
  const sharedOwners = useMemo(() => [...new Set(labels.items.map((label) => label.ownerUserId))].sort(), [labels.items]);

  useEffect(() => {
    if (view === "shared" && !filters.ownerUserId && sharedOwners.length > 0) {
      setFilters({ ownerUserId: sharedOwners[0] });
    }
  }, [filters.ownerUserId, setFilters, sharedOwners, view]);

  const selectedLabel = labels.items.find((label) =>
    label.key === filters.labelKey && label.value === filters.labelValue &&
    (view === "mine" || label.ownerUserId === filters.ownerUserId));

  return (
    <div className="z-20 shrink-0">
    <header className="h-16 bg-panel/70 backdrop-blur-md border-b border-border px-6 flex items-center justify-between">
      <div className="flex min-w-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <div key={index} className="flex items-center gap-2">
              <span className={`truncate ${isLast ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {crumb}
              </span>
              {!isLast && <span className="text-border">/</span>}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        {view === "shared" && <label className="grid gap-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Shared by
          <select aria-label="Shared catalog owner" value={filters.ownerUserId ?? ""} onChange={(event) => setFilters({ ownerUserId: event.target.value || null, labelKey: null, labelValue: null })} className="h-[34px] min-w-40 rounded-lg border border-border bg-surface px-2 text-xs normal-case tracking-normal text-foreground">
            {sharedOwners.length === 0 && <option value="">No shared owners</option>}
            {sharedOwners.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
          </select>
        </label>}
        <label className="grid gap-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Label
          <select aria-label="Catalog label filter" value={selectedLabel?.id ?? ""} onChange={(event) => { const label = labels.items.find((item) => item.id === event.target.value); setFilters({ labelKey: label?.key ?? null, labelValue: label?.value ?? null }); }} className="h-[34px] min-w-36 rounded-lg border border-border bg-surface px-2 text-xs normal-case tracking-normal text-foreground">
            <option value="">All labels</option>
            {labels.items.filter((label) => view === "mine" || label.ownerUserId === filters.ownerUserId).map((label) => <option key={label.id} value={label.id}>{label.key}: {label.value}</option>)}
          </select>
        </label>
        {labels.hasNextPage && <button type="button" onClick={() => void labels.fetchNextPage()} disabled={labels.isFetchingNextPage} className="h-[34px] rounded-lg border border-border bg-surface px-3 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
          {labels.isFetchingNextPage ? "Loading…" : "Load more filters"}
        </button>}
        {manageableLabels.length > 0 && <button onClick={() => setShareOpen(true)} className="flex h-[34px] items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Share2 size={14} />Share label</button>}
        <MineSharedSwitch />
      </div>
    </header>
    {shareOpen && <ShareLabelModal open={shareOpen} onOpenChange={setShareOpen} labels={manageableLabels} />}
    </div>
  );
}
