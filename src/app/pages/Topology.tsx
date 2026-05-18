import { Network, Server as ServerIcon, Plug, Plus, X, Building } from "lucide-react";
import { useState, useEffect } from "react";

import { API_BASE } from "../../core/api";
import { RegisterModal } from "../components/RegisterModal";

type RegistryPort = { id: string; portNumber: number; appName: string };
type RegistryServer = { id: string; ipAddress: string; hostname: string; ports: RegistryPort[] };

export function Topology() {
  const [registryData, setRegistryData] = useState<RegistryServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_BASE}/api/analytics/topology`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: RegistryServer[]) => setRegistryData(data))
      .catch((err) => console.error("[Topology] Failed to fetch topology:", err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 h-full flex flex-col bg-background font-body">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2 font-display">
            <Network className="text-secondary" />
            Infrastructure Registry View
          </h2>
          <p className="text-secondary mt-1 text-sm">Visual representation of expected network locations, servers, and applications.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-tertiary hover:bg-tertiary/90 text-primary-foreground transition-all shadow-[0_0_15px_rgba(255,77,126,0.2)]"
        >
          <Plus size={16} /> Register New Entity
        </button>
      </div>

      <div className="flex-1 bg-surface border border-border rounded-xl p-8 overflow-auto min-h-[500px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 text-secondary">
              <div className="w-8 h-8 border-2 border-border border-t-tertiary rounded-full animate-spin" />
              <span className="text-sm font-label uppercase">Loading topology...</span>
            </div>
          </div>
        ) : (
          <div className="inline-flex py-8">
            <DatacenterNode data={registryData} />
          </div>
        )}
      </div>

      {isModalOpen && (
        <RegisterModal onClose={() => setIsModalOpen(false)} servers={registryData} />
      )}
    </div>
  );
}

function DatacenterNode({ data }: { data: any[] }) {
  return (
    <div className="flex items-center">
      <div className="z-10 flex items-center gap-3 px-5 py-3 bg-surface border border-border rounded-xl text-primary shadow-md whitespace-nowrap">
        <div className="bg-background p-2 rounded-lg border border-border">
          <Building size={20} className="text-secondary" />
        </div>
        <div>
          <div className="font-bold text-sm font-display">Corporate Datacenter</div>
          <div className="text-[10px] text-secondary font-label mt-0.5 uppercase tracking-tight">10.0.0.0/16</div>
        </div>
      </div>

      {data && data.length > 0 && (
        <div className="relative flex flex-col ml-12">
          <div className="absolute -left-12 top-1/2 w-6 h-px bg-secondary/50"></div>

          {data.map((server, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === data.length - 1;
            const isOnly = data.length === 1;

            return (
              <div key={server.id} className="relative flex items-center py-5 pl-6">
                {isOnly ? (
                  <div className="absolute -left-6 top-1/2 w-6 h-px bg-secondary/50"></div>
                ) : isFirst ? (
                  <div className="absolute -left-6 top-1/2 bottom-0 w-6 border-l border-t border-secondary/50 rounded-tl-xl"></div>
                ) : isLast ? (
                  <div className="absolute -left-6 top-0 h-1/2 w-6 border-l border-b border-secondary/50 rounded-bl-xl"></div>
                ) : (
                  <>
                    <div className="absolute -left-6 top-0 bottom-0 border-l border-secondary/50"></div>
                    <div className="absolute -left-6 top-1/2 w-6 h-px bg-secondary/50"></div>
                  </>
                )}
                
                <div className="z-10">
                  <ServerNode server={server} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ServerNode({ server }: { server: any }) {
  return (
    <div className="flex items-center">
      <div className="z-10 flex items-center gap-3 px-4 py-2.5 bg-surface/80 border border-border rounded-lg text-primary shadow-sm whitespace-nowrap hover:bg-background transition-colors group">
        <ServerIcon size={16} className="text-secondary group-hover:text-tertiary transition-colors" />
        <div className="flex flex-col">
          <span className="font-label text-sm leading-tight">{server.ipAddress}</span>
          <span className="text-[10px] text-secondary leading-tight font-label uppercase">{server.hostname}</span>
        </div>
      </div>

      {server.ports && server.ports.length > 0 && (
        <div className="relative flex flex-col ml-12">
          <div className="absolute -left-12 top-1/2 w-6 h-px bg-secondary/50"></div>

          {server.ports.map((port: any, idx: number) => {
            const isFirst = idx === 0;
            const isLast = idx === server.ports.length - 1;
            const isOnly = server.ports.length === 1;

            return (
              <div key={port.id} className="relative flex items-center py-2 pl-6">
                {isOnly ? (
                  <div className="absolute -left-6 top-1/2 w-6 h-px bg-secondary/50"></div>
                ) : isFirst ? (
                  <div className="absolute -left-6 top-1/2 bottom-0 w-6 border-l border-t border-secondary/50 rounded-tl-xl"></div>
                ) : isLast ? (
                  <div className="absolute -left-6 top-0 h-1/2 w-6 border-l border-b border-secondary/50 rounded-bl-xl"></div>
                ) : (
                  <>
                    <div className="absolute -left-6 top-0 bottom-0 border-l border-secondary/50"></div>
                    <div className="absolute -left-6 top-1/2 w-6 h-px bg-secondary/50"></div>
                  </>
                )}
                
                <div className="z-10">
                  <PortNode port={port} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PortNode({ port }: { port: any }) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 rounded-lg border border-border bg-surface text-primary w-64 shadow-sm hover:border-tertiary/50 transition-colors group">
      <div className="flex items-center gap-2 min-w-[70px]">
        <Plug size={14} className="text-secondary group-hover:text-tertiary transition-colors" />
        <span className="font-label text-sm font-bold">{port.portNumber}</span>
      </div>
      <div className="w-px h-4 bg-border"></div>
      <div className="flex-1 text-xs font-label uppercase tracking-wider truncate text-secondary group-hover:text-primary transition-colors">
        {port.appName}
      </div>
    </div>
  );
}
