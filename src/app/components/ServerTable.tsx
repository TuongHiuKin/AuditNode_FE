import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { Grid, ChevronDown, ChevronRight, Plus, Filter, X, Check } from "lucide-react";
import { ActionButtons } from "./ActionButtons";
import { Schemas } from "../../shared/api/client";
import UniversalSearch from "./UniversalSearch";
import { ToolbarDropdown } from "../../features/dependency-graph/components/ToolbarDropdown";
import { useServers } from "../../hooks/queries/useServers";
import { LabelBadge, LabelData } from "./LabelBadge";
import { LabelFilterDropdown } from "./LabelFilterDropdown";

type ServerRow = Schemas["ServerResponseDto"];

const ENV_OPTIONS = ["All", "Production", "Staging", "Development"];

const statusStyles: Record<string, { label: string; dot: string; text: string }> = {
  active: { label: "Active", dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]", text: "text-emerald-400" },
  inactive: { label: "Inactive", dot: "bg-slate-500", text: "text-slate-400" },
  maintenance: { label: "Maintenance", dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]", text: "text-amber-400" },
  warning: { label: "Warning", dot: "bg-primary animate-pulse shadow-[0_0_8px_rgba(229,67,95,0.5)]", text: "text-primary" },
  standby: { label: "Standby", dot: "bg-slate-400", text: "text-slate-300" },
  retired: { label: "Retired", dot: "bg-slate-600", text: "text-slate-500" },
  unknown: { label: "Unknown", dot: "bg-slate-500", text: "text-slate-400" },
};

// ── Loading Skeleton ──────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="flex-1 flex flex-col gap-3 p-6 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-[52px] bg-surface/60 rounded-lg" />
      ))}
    </div>
  );
}

// ── ServerTable ───────────────────────────────────────────────────────────────
export function ServerTable({
  onEditClick,
  onMigrateClick,
  onDeleteClick,
  filterId,
  onSelectResult,
  onClearFilter,
  selectedIds = [],
  onSelectRow = () => { },
  onSelectAll = () => { },
  isSelectionMode = false,
  selectedColumns = [],
  toggleColumn = () => { },
  toolbarEl = null,
}: {
  onEditClick: (id: string, type: "SERVER" | "APP") => void;
  onMigrateClick: (id: string) => void;
  onDeleteClick: (id: string, name: string) => void;
  filterId?: string;
  onSelectResult: (id: string, type: 'SERVER' | 'APP') => void;
  onClearFilter: () => void;
  selectedIds?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  isSelectionMode?: boolean;
  selectedColumns?: string[];
  toggleColumn?: (key: string) => void;
  toolbarEl?: HTMLDivElement | null;
}) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [envFilter, setEnvFilter] = useState("Development");
  const [selectedLabelKeys, setSelectedLabelKeys] = useState<string[]>([]);
  const navigate = useNavigate();

  const { data: servers = [], isLoading } = useServers();

  const availableLabels = useMemo(() => {
    const labelsMap = new Map<string, LabelData>();
    servers.forEach((s: any) => {
      s.labels?.forEach((l: any) => {
        if (!labelsMap.has(l.key)) {
          labelsMap.set(l.key, l);
        }
      });
    });
    return Array.from(labelsMap.values());
  }, [servers]);

  const filteredServers = useMemo(() => {
    if (filterId) {
      return servers.filter((s: ServerRow) => s.id === filterId);
    }
    return servers.filter((s: ServerRow) => {
      const matchesEnv = envFilter === "All" ||
        s.environment?.toLowerCase() === envFilter.toLowerCase();

      const matchesSearch = !searchQuery ||
        s.hostname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.ipAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.osType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.environment?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLabels = selectedLabelKeys.length === 0 || 
        selectedLabelKeys.some(key => (s as any).labels?.some((l: any) => l.key === key));

      return matchesEnv && matchesSearch && matchesLabels;
    });
  }, [servers, searchQuery, envFilter, filterId]);

  const allIdsOnPage = useMemo(() => filteredServers.map(s => s.id!).filter(Boolean), [filteredServers]);
  const isAllSelected = allIdsOnPage.length > 0 && allIdsOnPage.every(id => selectedIds.includes(id));

  const toggleRow = (id: string) =>
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

  const goToDep = (id: string, env?: string) => {
    let url = `/dependency-manager?entityId=${id}&type=server`;
    if (env) {
      url += `&environment=${env.toLowerCase()}`;
    }
    navigate(url);
  };

  // Toolbar content — teleported via portal into InventoryLayout's Tier 2 filter bar
  const toolbarContent = !isSelectionMode ? (
    <>
      {!filterId ? (
        <>
          <div className="w-64">
            <UniversalSearch
              value={searchQuery}
              onChange={setSearchQuery}
              onSelectResult={onSelectResult}
              placeholder="Filter results..."
              inputClassName="py-1.5 h-[34px]"
            />
          </div>

          <div className="h-5 w-px bg-border mx-1" />

          <ToolbarDropdown
            label="Environment"
            value={envFilter}
            options={ENV_OPTIONS.map(opt => ({ value: opt, label: opt === "All" ? "Environment" : opt }))}
            onChange={setEnvFilter}
          />

          <div className="h-5 w-px bg-border mx-1" />

          <LabelFilterDropdown
            availableLabels={availableLabels}
            selectedKeys={selectedLabelKeys}
            onChange={setSelectedLabelKeys}
          />
        </>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-surface px-3 py-2 rounded-lg border border-border">
          <span className="font-semibold text-primary">FILTERED VIEW</span>
          <span className="opacity-50">|</span>
          <span className="truncate max-w-[150px] font-label">ID: {filterId}</span>
          <button onClick={onClearFilter} className="text-muted-foreground hover:text-foreground ml-1 transition-colors">
            <X size={12} />
          </button>
        </div>
      )}
    </>
  ) : null;

  return (
    <>
      {/* Teleport toolbar into InventoryLayout's fixed shrink-0 slot */}
      {toolbarEl && toolbarContent && createPortal(toolbarContent, toolbarEl)}

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <div className="overflow-auto flex-1 relative min-h-0">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 bg-panel shadow-sm outline outline-1 outline-border outline-offset-[-1px]">
                <tr className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {isSelectionMode && (
                    <th className="px-6 py-4 w-12">
                      <div
                        onClick={() => onSelectAll(allIdsOnPage)}
                        className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all ${isAllSelected ? "bg-primary border-primary" : "border-border hover:border-muted-foreground"
                          }`}
                      >
                        {isAllSelected && <Check size={10} className="text-primary-foreground" />}
                      </div>
                    </th>
                  )}
                  {[
                    { key: "ipAddress", label: "IP Address" },
                    { key: "hostname", label: "Hostname" },
                    { key: "osType", label: "OS Type" },
                    { key: "status", label: "Status" },
                    { key: "environment", label: "Environment" },
                    { key: "labels", label: "Labels" },
                  ].map((col) => {
                    const isSelected = selectedColumns.includes(col.key);
                    return (
                      <th
                        key={col.key}
                        className={`px-3 py-2 font-label text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${isSelectionMode ? "cursor-pointer" : ""
                          }`}
                        onClick={() => isSelectionMode && toggleColumn(col.key)}
                      >
                        <div className={`px-3 py-2 rounded-md border transition-all duration-200 ${isSelectionMode
                            ? isSelected
                              ? "bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(229,67,95,0.1)]"
                              : "bg-transparent border-transparent hover:bg-surface-hover text-muted-foreground"
                            : "border-transparent"
                          }`}>
                          {col.label}
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-6 py-4 font-label text-[10px] font-bold uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredServers.length === 0 ? (
                  <tr>
                    <td colSpan={isSelectionMode ? 6 : 5} className="px-6 py-12 text-center text-sm text-muted-foreground italic">
                      {searchQuery ? "No servers match your search." : "No servers found. Check your backend connection."}
                    </td>
                  </tr>
                ) : (
                  filteredServers.map((server) => (
                    <ServerRowItem
                      key={server.id}
                      server={server}
                      expanded={!!expandedRows[server.id!]}
                      isSelected={selectedIds.includes(server.id!)}
                      onSelect={() => onSelectRow(server.id!)}
                      onToggle={() => toggleRow(server.id!)}
                      onDepClick={(id, env) => goToDep(id, env)}
                      onEditClick={onEditClick}
                      onMigrateClick={onMigrateClick}
                      onDeleteClick={onDeleteClick}
                      isSelectionMode={isSelectionMode}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── ServerRowItem ─────────────────────────────────────────────────────────────
function ServerRowItem({
  server, expanded, isSelected, onSelect, onToggle, onDepClick, onEditClick, onMigrateClick, onDeleteClick, isSelectionMode,
}: {
  server: ServerRow;
  expanded: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDepClick: (id: string, env?: string) => void;
  onEditClick: (id: string, type: "SERVER" | "APP") => void;
  onMigrateClick: (id: string) => void;
  onDeleteClick: (id: string, name: string) => void;
  isSelectionMode: boolean;
}) {
  return (
    <>
      <tr
        className={`group cursor-pointer border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors ${expanded ? "bg-surface/60" : ""} ${isSelected ? "bg-primary/5" : ""}`}
        onClick={isSelectionMode ? onSelect : onToggle}
      >
        {isSelectionMode && (
          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
            <div
              onClick={onSelect}
              className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all ${isSelected ? "bg-primary border-primary" : "border-border hover:border-muted-foreground"
                }`}
            >
              {isSelected && <Check size={10} className="text-primary-foreground" />}
            </div>
          </td>
        )}
        <td className="px-6 py-4">
          <div className="flex items-center gap-2 font-mono text-muted-foreground">
            {!isSelectionMode && (
              <ChevronRight className={`size-3.5 transition-transform ${expanded ? "rotate-90 text-primary" : ""}`} />
            )}
            {server.ipAddress}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="font-semibold text-foreground">{server.hostname}</div>
          <div className="text-[11px] text-muted-foreground capitalize">{(server as any).provider || server.environment || "Unknown"}</div>
        </td>
        <td className="px-6 py-4 text-muted-foreground">{server.osType}</td>
        
        {/* Status */}
        <td className="px-6 py-4">
          {(() => {
            const st = server.status?.toLowerCase() || "unknown";
            const style = statusStyles[st] || statusStyles.unknown;
            return (
              <div className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${style.dot}`} />
                <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
              </div>
            );
          })()}
        </td>

        <td className="px-6 py-4">
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-label font-bold border tracking-wider ${server.environment === "Production"
              ? "text-primary bg-primary/10 border-primary/20"
              : "text-muted-foreground bg-surface-hover border-border"
            }`}>
            {server.environment?.toUpperCase() ?? "UNKNOWN"}
          </span>
        </td>
        
        <td className="px-6 py-4">
          <div className="flex flex-wrap gap-1.5 max-w-[200px]">
            {(server as any).labels?.map((label: LabelData) => (
              <LabelBadge key={label.key} label={label} />
            ))}
          </div>
        </td>

        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
          <ActionButtons
            onDepClick={() => onDepClick(server.id || "", server.environment)}
            onEditClick={() => onEditClick(server.id || "", "SERVER")}
            onDeleteClick={() => onDeleteClick(server.id || "", server.hostname || "Server")}
          />
        </td>
      </tr>

      {expanded && !isSelectionMode && (
        <tr className="bg-background/40">
          <td colSpan={6} className="p-0 border-t border-border">
            <div className="px-12 py-4">
              <h4 className="text-[10px] font-label font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2 tracking-widest">
                <Grid size={12} /> DEPLOYED APPLICATIONS
              </h4>
              {(server.applications?.length || 0) > 0 ? (
                <table className="w-full text-left bg-surface/40 rounded-lg overflow-hidden border border-border/50">
                  <thead className="bg-surface text-[10px] text-muted-foreground font-label uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2 font-bold">App Code</th>
                      <th className="px-4 py-2 font-bold">App Name</th>
                      <th className="px-4 py-2 font-bold">Port</th>
                      <th className="px-4 py-2 font-bold">Protocol</th>
                      <th className="px-4 py-2 font-bold">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {server.applications?.map((app) => (
                      <tr key={app.id} className="hover:bg-surface-hover transition-colors text-foreground/80">
                        <td className="px-4 py-2 font-label text-[11px] font-bold tracking-tight">{app.appCode}</td>
                        <td className="px-4 py-2 text-sm">{app.appName}</td>
                        <td className="px-4 py-2 font-label text-[11px] font-bold text-primary tracking-tighter">{app.portNumber}</td>
                        <td className="px-4 py-2 text-[10px] font-label font-bold text-muted-foreground/70 uppercase">{app.protocol}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground/70">{(app as any).ownerTeam || app.ownerId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-muted-foreground italic px-2 font-body tracking-tight">No applications currently deployed on this server.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
