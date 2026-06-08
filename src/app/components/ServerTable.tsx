import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Grid, ChevronDown, ChevronRight, Plus, Filter, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ActionButtons } from "./ActionButtons";
import apiClient, { Schemas } from "../../shared/api/client";
import UniversalSearch from "./UniversalSearch";

type ServerRow = Schemas["ServerResponseDto"];

const ENV_OPTIONS = ["All", "Production", "Staging", "Development"];

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
  onRegister,
  onEditClick,
  onMigrateClick,
  onDeleteClick,
  filterId,
  onSelectResult,
  onClearFilter,
}: {
  onRegister: () => void;
  onEditClick: (id: string, type: "SERVER" | "APP") => void;
  onMigrateClick: (id: string) => void;
  onDeleteClick: (id: string, name: string) => void;
  filterId?: string;
  onSelectResult: (id: string, type: 'SERVER' | 'APP') => void;
  onClearFilter: () => void;
}) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [envFilter, setEnvFilter] = useState("Development");
  const navigate = useNavigate();

  const { data: servers = [], isLoading } = useQuery<ServerRow[]>({
    queryKey: ["servers"],
    queryFn: async () => {
      const response = await apiClient.get<ServerRow[]>("/api/Servers");
      const rawResponse = response as any;
      // Safely handle both direct array and wrapped response { data: [...] }
      const data = Array.isArray(rawResponse.data) ? rawResponse.data : (rawResponse.data?.data || []);
      return data as ServerRow[];
    },
  });

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

      return matchesEnv && matchesSearch;
    });
  }, [servers, searchQuery, envFilter, filterId]);

  const toggleRow = (id: string) =>
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

  const goToDep = (id: string) =>
    navigate("/dependency-manager", { state: { selectedEntityId: id } });

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
                  value={envFilter}
                  onChange={(e) => setEnvFilter(e.target.value)}
                  className="w-full appearance-none bg-[#050811] border border-slate-800 text-sm text-primary rounded-lg py-2 pl-9 pr-8 focus:outline-none focus:ring-1 focus:ring-tertiary transition-all cursor-pointer"
                >
                  {ENV_OPTIONS.map(opt => (
                    <option key={opt} value={opt} className="bg-[#050811]">
                      {opt === "All" ? "Environment" : opt}
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
            {isLoading ? "…" : `${filteredServers.length} TOTAL`}
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
                <th className="px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-widest">IP Address</th>
                <th className="px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-widest">Hostname</th>
                <th className="px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-widest">OS Type</th>
                <th className="px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-widest">Environment</th>
                <th className="px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/50">
              {filteredServers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-secondary italic">
                    {searchQuery ? "No servers match your search." : "No servers found. Check your backend connection."}
                  </td>
                </tr>
              ) : (
                filteredServers.map((server) => (
                  <ServerRowItem
                    key={server.id}
                    server={server}
                    expanded={!!expandedRows[server.id!]}
                    onToggle={() => toggleRow(server.id!)}
                    onDepClick={(id) => goToDep(id)}
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

// ── ServerRowItem ─────────────────────────────────────────────────────────────
function ServerRowItem({
  server, expanded, onToggle, onDepClick, onEditClick, onMigrateClick, onDeleteClick,
}: { 
  server: ServerRow; 
  expanded: boolean; 
  onToggle: () => void; 
  onDepClick: (id: string) => void;
  onEditClick: (id: string, type: "SERVER" | "APP") => void;
  onMigrateClick: (id: string) => void;
  onDeleteClick: (id: string, name: string) => void;
}) {
  return (
    <>
      <tr
        className={`hover:bg-[#0c1322] transition-all duration-200 ease-in-out cursor-pointer ${expanded ? "bg-[#0c1322]/60" : ""}`}
        onClick={onToggle}
      >
        <td className="px-6 py-4 font-mono text-[11px] font-bold text-primary flex items-center gap-2 tracking-tight">
          {expanded
            ? <ChevronDown size={14} className="text-secondary" />
            : <ChevronRight size={14} className="text-secondary" />}
          {server.ipAddress}
        </td>
        <td className="px-6 py-4 text-sm font-medium text-primary/90">{server.hostname}</td>
        <td className="px-6 py-4 text-sm text-secondary/70">{server.osType}</td>
        <td className="px-6 py-4">
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
            server.environment === "Production"
              ? "text-tertiary bg-tertiary/10 border-tertiary/20"
              : "text-slate-400 bg-slate-500/10 border-slate-500/20"
          }`}>
            {server.environment?.toUpperCase() ?? "UNKNOWN"}
          </span>
        </td>
        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
          <ActionButtons 
            onDepClick={() => onDepClick(server.id || "")} 
            onEditClick={() => onEditClick(server.id || "", "SERVER")}
            onDeleteClick={() => onDeleteClick(server.id || "", server.hostname || "Server")}
          />
        </td>
      </tr>

      {expanded && (
        <tr className="bg-[#050811]/40">
          <td colSpan={5} className="p-0 border-t border-slate-900">
            <div className="px-12 py-4">
              <h4 className="text-[10px] font-mono font-bold text-slate-500 uppercase mb-3 flex items-center gap-2 tracking-widest">
                <Grid size={12} /> DEPLOYED APPLICATIONS
              </h4>
              {(server.applications?.length || 0) > 0 ? (
                <table className="w-full text-left bg-[#0c1322]/40 rounded-lg overflow-hidden border border-slate-800/50">
                  <thead className="bg-[#0c1322] text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2 font-bold">App Code</th>
                      <th className="px-4 py-2 font-bold">App Name</th>
                      <th className="px-4 py-2 font-bold">Port</th>
                      <th className="px-4 py-2 font-bold">Protocol</th>
                      <th className="px-4 py-2 font-bold">Owner</th>
                      <th className="px-4 py-2 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/50">
                    {server.applications?.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-900/30 transition-colors text-primary/80">
                        <td className="px-4 py-2 font-mono text-[11px] font-bold tracking-tight">{app.appCode}</td>
                        <td className="px-4 py-2 text-sm">{app.appName}</td>
                        <td className="px-4 py-2 font-mono text-[11px] font-bold text-tertiary tracking-tighter">{app.portNumber}</td>
                        <td className="px-4 py-2 text-[10px] font-mono font-bold text-secondary/70 uppercase">{app.protocol}</td>
                        <td className="px-4 py-2 text-xs text-secondary/70">{(app as any).ownerTeam || app.ownerId}</td>
                        <td className="px-4 py-2 text-right">
                          <ActionButtons 
                            onDepClick={() => onDepClick((app as any).applicationId || (app as any).appId || app.id || "")} 
                            onEditClick={() => onMigrateClick((app as any).applicationId || (app as any).appId || app.id || "")}
                            onDeleteClick={() => onDeleteClick((app as any).applicationId || (app as any).appId || app.id || "", app.appName || "")}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-slate-500 italic px-2 font-body tracking-tight">No applications currently deployed on this server.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
