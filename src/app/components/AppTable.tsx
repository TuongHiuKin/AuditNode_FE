import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { Server, ChevronDown, ChevronRight, Plus, Filter, X, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ActionButtons } from "./ActionButtons";
import apiClient, { Schemas } from "../../shared/api/client";
import UniversalSearch from "./UniversalSearch";
import { Dropdown } from "../../shared/ui/Dropdown";
import { LabelBadge, LabelData } from "./LabelBadge";
import { LabelFilterDropdown } from "./LabelFilterDropdown";

type AppRow = Schemas["ApplicationResponseDto"] & {
  description?: string;
};

const RISK_OPTIONS = ["All", "Critical", "High", "Medium", "Low"];

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

// ── AppTable ──────────────────────────────────────────────────────────────────
export function AppTable({
  onEditClick,
  onMigrateClick,
  onDeleteClick,
  filterId,
  onSelectResult,
  onClearFilter,
  selectedIds = [],
  onSelectRow = () => {},
  onSelectAll = () => {},
  isSelectionMode = false,
  selectedColumns = [],
  toggleColumn = () => {},
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
  const [riskFilter, setRiskFilter] = useState("All");
  const [selectedLabelKeys, setSelectedLabelKeys] = useState<string[]>([]);
  const navigate = useNavigate();

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const response = await apiClient.get<Schemas["ApplicationResponseDto"][]>("/api/v1/applications");
      const rawResponse = response as any;
      // Safely destructure: handle both direct array and wrapped response { data: [...] }
      const rawData = Array.isArray(rawResponse.data) ? rawResponse.data : (rawResponse.data?.data || []);
      
      return rawData.map((app: any) => ({
        ...app,
        description: app.description || app.techStack
      }));
    },
  });

  const filteredApps = useMemo(() => {
    if (filterId) {
      return apps.filter((app: AppRow) => app.id === filterId);
    }
    return apps.filter((app: AppRow) => {
      const matchesRisk = riskFilter === "All" ||
        app.risk?.toLowerCase() === riskFilter.toLowerCase();

      const matchesSearch = !searchQuery ||
        app.appName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.appCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.ownerId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app as any).ownerTeam?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.risk?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLabels = selectedLabelKeys.length === 0 || 
        selectedLabelKeys.some(val => (app as any).labels?.some((l: any) => l.value === val));

      return matchesRisk && matchesSearch && matchesLabels;
    });
  }, [apps, searchQuery, riskFilter, filterId, selectedLabelKeys]);

  const allIdsOnPage = useMemo(() => filteredApps.map((app: AppRow) => app.id!).filter(Boolean), [filteredApps]);
  const isAllSelected = allIdsOnPage.length > 0 && allIdsOnPage.every((id: string) => selectedIds.includes(id));

  const toggleRow = (id: string) =>
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

  const goToDep = (id: string, env?: string) => {
    let url = `/dependency-manager?entityId=${id}&type=app`;
    if (env) {
      url += `&environment=${env.toLowerCase()}`;
    }
    navigate(url);
  };

  // Toolbar content — teleported via portal into InventoryLayout's shrink-0 slot
  const toolbarContent = !isSelectionMode ? (
    <div className="flex justify-between items-center bg-transparent">
      <div className="flex items-center gap-3">
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
            
            <Dropdown
              label="Risk Level"
              value={riskFilter}
              options={RISK_OPTIONS.map(opt => ({ value: opt, label: opt === "All" ? "Risk Level" : opt }))}
              onChange={setRiskFilter}
            />
            
            <div className="h-5 w-px bg-border mx-1" />
            
            <LabelFilterDropdown
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
      </div>
    </div>
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
                      className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all ${
                        isAllSelected ? "bg-primary border-primary" : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      {isAllSelected && <Check size={10} className="text-primary-foreground" />}
                    </div>
                  </th>
                )}
                {[
                  { key: "appCode", label: "App Code" },
                  { key: "appName", label: "Application Name" },
                  { key: "ownerTeam", label: "Owner" },
                  { key: "risk", label: "Risk Level" },
                  { key: "labels", label: "Labels" },
                ].map((col) => {
                  const isSelected = selectedColumns.includes(col.key);
                  return (
                    <th 
                      key={col.key} 
                      className={`px-3 py-2 font-label text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${
                        isSelectionMode ? "cursor-pointer" : ""
                      }`}
                      onClick={() => isSelectionMode && toggleColumn(col.key)}
                    >
                      <div className={`px-3 py-2 rounded-md border transition-all duration-200 ${
                        isSelectionMode 
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
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={isSelectionMode ? 6 : 5} className="px-6 py-12 text-center text-sm text-muted-foreground italic">
                    {searchQuery ? "No applications match your search." : "No applications found. Check your backend connection."}
                  </td>
                </tr>
              ) : (
                filteredApps.map((app: AppRow) => (
                  <AppRowItem 
                    key={app.id} 
                    app={app} 
                    expanded={!!expandedRows[app.id!]}
                    isSelected={selectedIds.includes(app.id!)}
                    onSelect={() => onSelectRow(app.id!)}
                    onToggle={() => toggleRow(app.id!)} 
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

// ── AppRowItem ────────────────────────────────────────────────────────────────
function AppRowItem({
  app, expanded, isSelected, onSelect, onToggle, onDepClick, onEditClick, onMigrateClick, onDeleteClick, isSelectionMode,
}: { 
  app: AppRow; 
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
  const riskStyle =
    app.risk === "Critical" || app.risk === "High" ? "text-danger bg-danger/10 border-danger/20" :
    app.risk === "Medium"   ? "text-warning bg-warning/10 border-warning/20" :
                              "text-muted-foreground bg-surface-hover border-border";
  return (
    <>
      <tr className={`group cursor-pointer border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors ${expanded ? "bg-surface/60" : ""} ${isSelected ? "bg-primary/5" : ""}`}
        onClick={isSelectionMode ? onSelect : onToggle}>
        {isSelectionMode && (
          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
            <div 
              onClick={onSelect}
              className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all ${
                isSelected ? "bg-primary border-primary" : "border-border hover:border-muted-foreground"
              }`}
            >
              {isSelected && <Check size={10} className="text-primary-foreground" />}
            </div>
          </td>
        )}
        <td className="px-6 py-4 font-label text-[11px] font-bold text-foreground flex items-center gap-2 tracking-tight">
          {!isSelectionMode && (
            expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />
          )}
          {app.appCode}
        </td>
        <td className="px-6 py-4 font-medium text-sm text-foreground/90">
          <div>{app.appName}</div>
          {app.description && <div className="text-[10px] text-muted-foreground/60 font-normal mt-0.5">{app.description}</div>}
        </td>
        <td className="px-6 py-4 text-sm text-muted-foreground/80">{(app as any).ownerTeam || app.ownerId}</td>
        <td className="px-6 py-4">
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-label font-bold border uppercase tracking-tighter ${riskStyle}`}>{app.risk ?? "N/A"}</span>
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-wrap gap-1.5 max-w-[200px]">
            {(app as any).labels?.map((label: LabelData) => (
              <LabelBadge key={label.key} label={label} />
            ))}
          </div>
        </td>
        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
          <ActionButtons 
            onDepClick={() => onDepClick(app.id!, (app as any).environment)} 
            onEditClick={() => onEditClick(app.id!, "APP")}
            onDeleteClick={() => onDeleteClick(app.id!, app.appName || "")}
          />
        </td>
      </tr>

      {expanded && !isSelectionMode && (
        <tr className="bg-background/40">
          <td colSpan={6} className="p-0 border-t border-border">
            <div className="px-12 py-4">
              <h4 className="text-[10px] font-label font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2 tracking-widest">
                <Server size={12} /> DEPLOYED SERVERS
              </h4>
              {(app.servers?.length || 0) > 0 ? (
                <table className="w-full text-left bg-surface/40 rounded-lg overflow-hidden border border-border/50">
                  <thead className="bg-surface text-[10px] text-muted-foreground font-label uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2 font-bold">Hostname</th>
                      <th className="px-4 py-2 font-bold">IP Address</th>
                      <th className="px-4 py-2 font-bold">Port</th>
                      <th className="px-4 py-2 font-bold">Protocol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {app.servers?.map((srv) => (
                      <tr key={srv.id} className="hover:bg-surface-hover transition-colors text-foreground/80">
                        <td className="px-4 py-2 text-sm">{srv.hostname}</td>
                        <td className="px-4 py-2 font-label text-[11px]">{srv.ipAddress}</td>
                        <td className="px-4 py-2 font-label text-[11px]">{srv.portNumber}</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-label font-bold border text-muted-foreground bg-surface-hover border-border">
                            {srv.protocol?.toUpperCase() ?? "UNKNOWN"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-muted-foreground italic px-2 font-body tracking-tight">This application is not associated with any known servers.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
