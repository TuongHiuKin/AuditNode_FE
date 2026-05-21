import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Server, Search, ChevronDown, ChevronRight } from "lucide-react";
import { ActionButtons } from "./ActionButtons";
import { API_BASE } from "../../core/api";

type ServerRef = {
  id: string;
  ipAddress: string;
  hostname: string;
  osType: string;
  environment: string;
  status: string;
};

type AppRow = {
  id: string;
  appCode: string;
  appName: string;
  ownerId: string;
  risk: string;
  desc: string;
  servers: ServerRef[];
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
  const [apps, setApps] = useState<AppRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_BASE}/api/applications`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: AppRow[]) => setApps(data))
      .catch((err) => console.error("[AppTable] Failed to fetch applications:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const toggleRow = (id: string) =>
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

  const goToDep = (id: string) =>
    navigate("/dependency-manager", { state: { selectedEntityId: id } });

  return (
    <div className="flex-1 bg-surface border border-border rounded-xl overflow-hidden shadow-xl flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b border-border bg-surface flex justify-between items-center shrink-0">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
          <input type="text" placeholder="Search applications..."
            className="w-full bg-background border border-border text-sm text-primary rounded-lg py-1.5 pl-9 pr-4 focus:outline-none focus:ring-1 focus:ring-tertiary" />
        </div>
        <span className="text-xs text-secondary font-label bg-background px-2.5 py-1 rounded-full border border-border">
          {isLoading ? "…" : `${apps.length} TOTAL`}
        </span>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-secondary bg-background/60">
                <th className="px-6 py-4 font-label uppercase">App Code</th>
                <th className="px-6 py-4 font-label uppercase">Application Name</th>
                <th className="px-6 py-4 font-label uppercase">Owner</th>
                <th className="px-6 py-4 font-label uppercase">Risk Level</th>
                <th className="px-6 py-4 font-label uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {apps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-secondary italic">
                    No applications found. Check your backend connection.
                  </td>
                </tr>
              ) : (
                apps.map((app) => (
                  <AppRowItem key={app.id} app={app} expanded={!!expandedRows[app.id]}
                    onToggle={() => toggleRow(app.id)} onDepClick={(id) => goToDep(id)} />
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
    app.risk === "Critical" ? "bg-tertiary/10 text-tertiary border-tertiary/30" :
    app.risk === "High"     ? "bg-primary/10 text-primary border-primary/30" :
                              "bg-secondary/10 text-secondary border-secondary/30";
  return (
    <>
      <tr className={`hover:bg-background transition-colors cursor-pointer ${expanded ? "bg-background/40" : ""}`}
        onClick={onToggle}>
        <td className="px-6 py-4 font-label text-sm text-primary flex items-center gap-2">
          {expanded ? <ChevronDown size={16} className="text-secondary" /> : <ChevronRight size={16} className="text-secondary" />}
          {app.appCode}
        </td>
        <td className="px-6 py-4 font-medium text-sm text-primary">{app.appName}</td>
        <td className="px-6 py-4 text-sm text-secondary">{app.ownerId}</td>
        <td className="px-6 py-4">
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-label border ${riskStyle}`}>{app.risk?.toUpperCase() ?? "N/A"}</span>
        </td>
        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
          <ActionButtons onDepClick={() => onDepClick(app.id)} />
        </td>
      </tr>

      {expanded && (
        <tr className="bg-background/20">
          <td colSpan={5} className="p-0 border-t border-border/30">
            <div className="px-12 py-4">
              <h4 className="text-xs font-label text-secondary uppercase mb-3 flex items-center gap-2">
                <Server size={14} /> Deployed Servers
              </h4>
              {(app.servers?.length || 0) > 0 ? (
                <table className="w-full text-left bg-background/50 rounded-lg overflow-hidden border border-border">
                  <thead className="bg-surface/50 text-xs text-secondary font-label uppercase">
                    <tr>
                      <th className="px-4 py-2">IP Address</th>
                      <th className="px-4 py-2">Hostname</th>
                      <th className="px-4 py-2">OS Type</th>
                      <th className="px-4 py-2">Environment</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {app.servers.map((srv) => (
                      <tr key={srv.id} className="hover:bg-surface/30 transition-colors text-primary">
                        <td className="px-4 py-2 font-label text-xs">{srv.ipAddress}</td>
                        <td className="px-4 py-2 text-sm">{srv.hostname}</td>
                        <td className="px-4 py-2 text-xs text-secondary">{srv.osType}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-label border ${
                            srv.environment === "Production" ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary/10 text-secondary border-secondary/20"
                          }`}>{srv.environment?.toUpperCase() ?? "UNKNOWN"}</span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="flex items-center gap-1.5 text-xs text-primary font-label uppercase">
                            <span className={`w-1.5 h-1.5 rounded-full ${srv.status === "Active" ? "bg-tertiary" : "bg-secondary"}`} />
                            {srv.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <ActionButtons onDepClick={() => onDepClick(srv.id)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-secondary italic px-2 font-body">This application is not associated with any known servers.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
