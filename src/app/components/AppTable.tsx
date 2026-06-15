import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Server, ChevronDown, ChevronRight, Plus, Filter, X, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ActionButtons } from "./ActionButtons";
import apiClient, { Schemas } from "../../shared/api/client";
import UniversalSearch from "./UniversalSearch";

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
  onRegister,
  onEditClick,
  onMigrateClick,
  onDeleteClick,
  filterId,
  onSelectResult,
  onClearFilter,
  selectedIds = [],
  onSelectRow = () => {},
  onSelectAll = () => {},
}: {
  onRegister: () => void;
  onEditClick: (id: string, type: "SERVER" | "APP") => void;
  onMigrateClick: (id: string) => void;
  onDeleteClick: (id: string, name: string) => void;
  filterId?: string;
  onSelectResult: (id: string, type: 'SERVER' | 'APP') => void;
  onClearFilter: () => void;
  selectedIds?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
}) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const navigate = useNavigate();

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const response = await apiClient.get<Schemas["ApplicationResponseDto"][]>("/api/Applications");
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

      return matchesRisk && matchesSearch;
    });
  }, [apps, searchQuery, riskFilter, filterId]);

  const allIdsOnPage = useMemo(() => filteredApps.map(app => app.id!).filter(Boolean), [filteredApps]);
  const isAllSelected = allIdsOnPage.length > 0 && allIdsOnPage.every(id => selectedIds.includes(id));

  const toggleRow = (id: string) =>
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

  const goToDep = (id: string, env?: string) => {
    let url = `/dependency-manager?entityId=${id}&type=app`;
    if (env) {
      url += `&environment=${env.toLowerCase()}`;
    }
    navigate(url);
  };

  return (
    <div className="flex-1 bg-[#0c1322] border border-slate-900 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Table Action Header */}
      <div className="flex justify-between items-center p-4 border-b border-slate-900 bg-[#0c1322]">
        <div className="flex items-center gap-3">
          {!filterId ? (
            <>
              <div className="w-72 relative">
                <UniversalSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSelectResult={onSelectResult}
                  placeholder="Search servers & apps..."
                />
              </div>
              <div className="w-48 relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="w-full appearance-none bg-[#050811] border border-slate-800 text-sm text-primary rounded-lg py-2 pl-9 pr-8 focus:outline-none focus:ring-1 focus:ring-tertiary transition-all cursor-pointer"
                >
                  {RISK_OPTIONS.map(opt => (
                    <option key={opt} value={opt} className="bg-[#050811]">
                      {opt === "All" ? "Risk Level" : opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-secondary bg-[#050811] px-3 py-2 rounded-lg border border-slate-800">
              <span className="font-semibold text-tertiary">FILTERED VIEW</span>
              <span className="opacity-50">|</span>
              <span className="truncate max-w-[150px]">ID: {filterId}</span>
              <button onClick={onClearFilter} className="text-slate-500 hover:text-primary ml-1 transition-colors">
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] text-slate-500 font-mono font-bold bg-[#050811] px-2.5 py-1.5 rounded-full border border-slate-800 uppercase tracking-widest">
            {isLoading ? "…" : `${filteredApps.length} TOTAL`}
          </span>
          <button
            onClick={onRegister}
            className="bg-tertiary hover:bg-tertiary/90 text-primary-foreground px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(255,77,126,0.2)]"
          >
            <Plus size={16} /> Register New Entity
          </button>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 bg-[#050811]/60">
                <th className="px-6 py-4 w-12">
                  <div 
                    onClick={() => onSelectAll(allIdsOnPage)}
                    className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all ${
                      isAllSelected ? "bg-tertiary border-tertiary" : "border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    {isAllSelected && <Check size={10} className="text-white" />}
                  </div>
                </th>
                <th className="px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-widest">App Code</th>
                <th className="px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-widest">Application Name</th>
                <th className="px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-widest">Owner</th>
                <th className="px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-widest">Risk Level</th>
                <th className="px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/50">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-secondary italic">
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
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── AppRowItem ────────────────────────────────────────────────────────────────
function AppRowItem({
  app, expanded, isSelected, onSelect, onToggle, onDepClick, onEditClick, onMigrateClick, onDeleteClick,
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
}) {
  const riskStyle =
    app.risk === "Critical" || app.risk === "High" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
    app.risk === "Medium"   ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                              "text-slate-400 bg-slate-500/10 border-slate-500/20";
  return (
    <>
      <tr className={`hover:bg-[#0c1322] transition-all duration-200 ease-in-out cursor-pointer ${expanded ? "bg-[#0c1322]/60" : ""} ${isSelected ? "bg-tertiary/5" : ""}`}
        onClick={onToggle}>
        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
          <div 
            onClick={onSelect}
            className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all ${
              isSelected ? "bg-tertiary border-tertiary" : "border-slate-700 hover:border-slate-500"
            }`}
          >
            {isSelected && <Check size={10} className="text-white" />}
          </div>
        </td>
        <td className="px-6 py-4 font-mono text-[11px] font-bold text-primary flex items-center gap-2 tracking-tight">
          {expanded ? <ChevronDown size={14} className="text-secondary" /> : <ChevronRight size={14} className="text-secondary" />}
          {app.appCode}
        </td>
        <td className="px-6 py-4 font-medium text-sm text-primary/90">
          <div>{app.appName}</div>
          {app.description && <div className="text-[10px] text-secondary/60 font-normal mt-0.5">{app.description}</div>}
        </td>
        <td className="px-6 py-4 text-sm text-secondary/80">{(app as any).ownerTeam || app.ownerId}</td>
        <td className="px-6 py-4">
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase tracking-tighter ${riskStyle}`}>{app.risk ?? "N/A"}</span>
        </td>
        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
          <ActionButtons 
            onDepClick={() => onDepClick(app.id!, (app as any).environment)} 
            onEditClick={() => onEditClick(app.id!, "APP")}
            onDeleteClick={() => onDeleteClick(app.id!, app.appName || "")}
          />
        </td>
      </tr>

      {expanded && (
        <tr className="bg-[#050811]/40">
          <td colSpan={6} className="p-0 border-t border-slate-900">
            <div className="px-12 py-4">
              <h4 className="text-[10px] font-mono font-bold text-slate-500 uppercase mb-3 flex items-center gap-2 tracking-widest">
                <Server size={12} /> DEPLOYED SERVERS
              </h4>
              {(app.servers?.length || 0) > 0 ? (
                <table className="w-full text-left bg-[#0c1322]/40 rounded-lg overflow-hidden border border-slate-800/50">
                  <thead className="bg-[#0c1322] text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2 font-bold">Hostname</th>
                      <th className="px-4 py-2 font-bold">IP Address</th>
                      <th className="px-4 py-2 font-bold">Port</th>
                      <th className="px-4 py-2 font-bold">Protocol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/50">
                    {app.servers?.map((srv) => (
                      <tr key={srv.id} className="hover:bg-slate-900/30 transition-colors text-primary/80">
                        <td className="px-4 py-2 text-sm">{srv.hostname}</td>
                        <td className="px-4 py-2 font-mono text-[11px]">{srv.ipAddress}</td>
                        <td className="px-4 py-2 font-mono text-[11px]">{srv.portNumber}</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border text-slate-400 bg-slate-500/10 border-slate-500/20">
                            {srv.protocol?.toUpperCase() ?? "UNKNOWN"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-slate-500 italic px-2 font-body tracking-tight">This application is not associated with any known servers.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
