import { useState } from "react";
import { useNavigate } from "react-router";
import { Server, Search, ChevronDown, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ActionButtons } from "./ActionButtons";
import apiClient, { Schemas } from "../../shared/api/client";

type AppRow = Schemas["ApplicationResponseDto"] & {
  description?: string;
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

// ── AppTable ──────────────────────────────────────────────────────────────────
export function AppTable() {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
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

  const toggleRow = (id: string) =>
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

  const goToDep = (id: string) =>
    navigate("/dependency-manager", { state: { selectedEntityId: id } });

  return (
    <div className="flex-1 bg-[#0c1322] border border-slate-900 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-900 bg-[#0c1322] flex justify-between items-center shrink-0">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input type="text" placeholder="Search applications..."
            className="w-full bg-[#050811] border border-slate-800 text-sm text-primary rounded-lg py-1.5 pl-9 pr-4 focus:outline-none focus:ring-1 focus:ring-tertiary transition-all" />
        </div>
        <span className="text-[10px] text-slate-500 font-mono font-bold bg-[#050811] px-2.5 py-1 rounded-full border border-slate-800 uppercase tracking-widest">
          {isLoading ? "…" : `${apps.length} TOTAL`}
        </span>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 bg-[#050811]/60">
                <th className="px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-widest">App Code</th>
                <th className="px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-widest">Application Name</th>
                <th className="px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-widest">Owner</th>
                <th className="px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-widest">Risk Level</th>
                <th className="px-6 py-4 font-mono text-[10px] font-bold uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/50">
              {apps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-secondary italic">
                    No applications found. Check your backend connection.
                  </td>
                </tr>
              ) : (
                apps.map((app: AppRow) => (
                  <AppRowItem key={app.id} app={app} expanded={!!expandedRows[app.id!]}
                    onToggle={() => toggleRow(app.id!)} onDepClick={(id) => goToDep(id)} />
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
  app, expanded, onToggle, onDepClick,
}: { app: AppRow; expanded: boolean; onToggle: () => void; onDepClick: (id: string) => void }) {
  const riskStyle =
    app.risk === "Critical" || app.risk === "High" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
    app.risk === "Medium"   ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                              "text-slate-400 bg-slate-500/10 border-slate-500/20";
  return (
    <>
      <tr className={`hover:bg-[#0c1322] transition-all duration-200 ease-in-out cursor-pointer ${expanded ? "bg-[#0c1322]/60" : ""}`}
        onClick={onToggle}>
        <td className="px-6 py-4 font-mono text-[11px] font-bold text-primary flex items-center gap-2 tracking-tight">
          {expanded ? <ChevronDown size={14} className="text-secondary" /> : <ChevronRight size={14} className="text-secondary" />}
          {app.appCode}
        </td>
        <td className="px-6 py-4 font-medium text-sm text-primary/90">
          <div>{app.appName}</div>
          {app.description && <div className="text-[10px] text-secondary/60 font-normal mt-0.5">{app.description}</div>}
        </td>
        <td className="px-6 py-4 text-sm text-secondary/80">{app.ownerId}</td>
        <td className="px-6 py-4">
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase tracking-tighter ${riskStyle}`}>{app.risk ?? "N/A"}</span>
        </td>
        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
          <ActionButtons onDepClick={() => onDepClick(app.id!)} />
        </td>
      </tr>

      {expanded && (
        <tr className="bg-[#050811]/40">
          <td colSpan={5} className="p-0 border-t border-slate-900">
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
                      <th className="px-4 py-2 text-right font-bold">Actions</th>
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
                        <td className="px-4 py-2 text-right">
                          <ActionButtons onDepClick={() => onDepClick(srv.id || "")} />
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

