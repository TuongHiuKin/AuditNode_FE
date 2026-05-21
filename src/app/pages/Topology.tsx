import { Network, Server as ServerIcon, Plug, Plus, Building, Filter, Hash } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { API_BASE, apiFetch } from "../../core/api";
import { RegisterModal } from "../components/RegisterModal";

type RegistryPort = { id: string; portNumber: number; appName: string };
type RegistryServer = { id: string; ipAddress: string; hostname: string; ports: RegistryPort[] };

export function Topology() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nodeLimit, setNodeLimit] = useState(50);

  const { data: registryData = [], isLoading: isInitialLoading, isFetching } = useQuery<RegistryServer[]>({
    queryKey: ["topology-tree"],
    queryFn: () => apiFetch("/api/topology/tree"),
  });

  const isLoading = isInitialLoading || isFetching;


  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 h-full flex flex-col bg-background font-body">

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2 font-display">
            <Network className="text-secondary" />
            Infrastructure Registry View
          </h2>
          <p className="text-secondary mt-1 text-sm">Visual representation of expected network locations, servers, and applications.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-lg">
            <Hash size={14} className="text-secondary" />
            <span className="text-xs font-label text-secondary uppercase">Node Limit</span>
            <input 
              type="number" 
              value={nodeLimit}
              onChange={(e) => setNodeLimit(parseInt(e.target.value) || 0)}
              className="w-16 bg-background border border-border rounded px-1.5 py-0.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-tertiary"
            />
          </div>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-tertiary hover:bg-tertiary/90 text-primary-foreground transition-all shadow-[0_0_15px_rgba(255,77,126,0.2)]"
          >
            <Plus size={16} /> Register New Entity
          </button>
        </div>
      </div>

      {/* Hierarchical Grid Canvas */}
      <div className="flex-1 bg-surface border border-border rounded-xl p-12 overflow-auto min-h-[500px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 text-secondary">
              <div className="w-8 h-8 border-2 border-border border-t-tertiary rounded-full animate-spin" />
              <span className="text-sm font-label uppercase">Loading topology...</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center min-w-max">
            {/* Level 1: Datacenter */}
            <div className="relative mb-16">
              <div className="z-10 flex items-center gap-3 px-6 py-4 bg-background border border-border rounded-2xl text-primary shadow-2xl border-t-tertiary/50">
                <div className="bg-surface p-2.5 rounded-xl border border-border">
                  <Building size={24} className="text-tertiary" />
                </div>
                <div>
                  <div className="font-bold text-base font-display">Corporate Datacenter</div>
                  <div className="text-[10px] text-secondary font-label mt-0.5 uppercase tracking-widest">Zone: US-EAST-1 (10.0.0.0/16)</div>
                </div>
              </div>
              {/* Vertical link line to Level 2 */}
              <div className="absolute left-1/2 top-full w-px h-16 bg-border -translate-x-1/2"></div>
            </div>

            {/* Level 2: Servers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 relative pt-4">
              {registryData.slice(0, nodeLimit).map((server) => (
                <div key={server.id} className="relative flex flex-col items-center">
                  <ServerNode server={server} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <RegisterModal onClose={() => setIsModalOpen(false)} servers={registryData} />
      )}
    </div>
  );
}

function ServerNode({ server }: { server: RegistryServer }) {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="z-10 w-full flex items-center gap-3 px-5 py-3.5 bg-background border border-border rounded-xl text-primary shadow-lg hover:border-tertiary/30 transition-all group">
        <div className="p-2 bg-surface rounded-lg border border-border group-hover:border-tertiary/20 transition-all">
          <ServerIcon size={18} className="text-secondary group-hover:text-tertiary transition-colors" />
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <span className="font-label text-sm font-bold truncate leading-none mb-1">{server.hostname}</span>
          <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-tighter bg-emerald-950/20 self-start px-1 rounded border border-emerald-500/20">
            {server.ipAddress}
          </span>
        </div>
      </div>

      {/* Ports List (Level 3) */}
      {server.ports && server.ports.length > 0 && (
        <div className="w-[85%] flex flex-col gap-2 mt-4 pt-4 border-t border-border/50 relative">
          {/* connector dot */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-border"></div>
          
          {server.ports.map((port) => (
            <div key={port.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-surface/50 text-primary hover:bg-background transition-colors group/port">
              <Plug size={12} className="text-secondary group-hover/port:text-tertiary" />
              <div className="flex-1 flex items-center justify-between gap-2 overflow-hidden">
                <span className="font-mono text-xs font-bold text-tertiary">{port.portNumber}</span>
                <span className="text-[10px] font-label uppercase truncate text-secondary group-hover/port:text-primary">
                  {port.appName}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

