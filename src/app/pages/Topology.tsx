import { Network, Server as ServerIcon, Plug, Building, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient, { Schemas } from "../../shared/api/client";
import { useHeader } from "../hooks/useHeader";

type RegistryServer = Schemas["ServerNodeDto"];

export function Topology() {
  const [nodeLimit, setNodeLimit] = useState(100);
  const { setHeader } = useHeader();

  useEffect(() => {
    setHeader(
      "Topology Network Map",
      "Hierarchical view of datacenters, servers, and active services.",
      <Network size={20} />
    );
  }, [setHeader]);

  const { data: topologyData = [], isLoading: isInitialLoading } = useQuery<Schemas["TopologyTreeDto"][]>({
    queryKey: ["topology-tree"],
    queryFn: async () => {
      const response = await apiClient.get<Schemas["TopologyTreeDto"][]>("/api/Topology/tree");
      const rawResponse = response as any;
      // Safely handle direct array and wrapped response { data: [...] }   
      return Array.isArray(rawResponse.data) ? rawResponse.data : (rawResponse.data?.data || []);
    },
    });
  // Flatten servers for the current tree layout. 
  // Handle both hierarchical (dc.servers) and flat (ServerTopologyDto[]) structures.
  const isFlatList = topologyData.length > 0 && !Object.prototype.hasOwnProperty.call(topologyData[0], 'servers');
  const registryData = isFlatList ? topologyData : topologyData.flatMap(dc => dc.servers || []);
  
  const mainDatacenter = !isFlatList && topologyData[0] 
    ? { name: topologyData[0].name, location: topologyData[0].location }
    : { name: "Corporate Datacenter", location: "Global Network" };

  // Clear loading once data is hydrated or initial fetch completes
  const isLoading = isInitialLoading && topologyData.length === 0;


  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 h-full flex flex-col bg-background font-body relative">

      {/* Main Dashboard Container */}
      <div className="flex-1 border border-border rounded-xl overflow-hidden flex flex-col bg-surface shadow-2xl relative z-10">

        {/* Filter Bar */}
        <div className="flex items-center justify-between p-4 bg-surface/90 backdrop-blur-sm border-b border-border shrink-0 z-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-secondary border-r border-border pr-4">
              <Filter size={16} />
              <span className="text-sm font-medium">Filters</span>
            </div>

            {/* Datacenter Dropdown */}
            <select className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary/50 appearance-none min-w-[160px] cursor-pointer">
              <option>All Datacenters / Zones</option>
              {topologyData.map(dc => (
                <option key={dc.id} value={dc.id}>{dc.name}</option>
              ))}
            </select>

            {/* Timeline Dropdown */}
            <select className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary/50 appearance-none min-w-[120px] cursor-pointer">
              <option>Live (Real-time)</option>
              <option>Max 24h</option>
              <option>Past 7 Days</option>
              <option>Past 30 Days</option>
            </select>

            {/* Display Node Limit */}
            <div className="flex items-center gap-3 bg-background border border-border rounded-lg px-3 py-1.5 focus-within:border-tertiary focus-within:ring-1 focus-within:ring-tertiary/50 transition-colors">
              <label className="text-xs text-secondary font-medium whitespace-nowrap">Display Node Limit</label>
              <input
                type="number"
                value={nodeLimit}
                onChange={(e) => setNodeLimit(parseInt(e.target.value) || 0)}
                className="bg-transparent text-sm text-primary w-12 focus:outline-none font-mono text-right"
              />
            </div>
          </div>
        </div>

        {/* Tree Canvas with dot-grid background */}
        <div
          className="flex-1 relative overflow-auto p-12"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(122,134,153,0.08) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        >
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
                <div className="z-10 flex items-center gap-3 px-6 py-4 bg-[#0c1322] border border-slate-800 rounded-xl text-primary shadow-xl">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 mb-1">
                    <Building size={20} className="text-tertiary" />
                  </div>
                  <div>
                    <div className="font-bold text-base font-display">{mainDatacenter.name}</div>
                    <div className="text-[10px] text-tertiary font-mono bg-tertiary/10 px-2 py-0.5 rounded border border-tertiary/20 mt-1 uppercase tracking-wider">{mainDatacenter.location || "N/A"}</div>
                  </div>
                </div>
                {/* Vertical link line to Level 2 */}
                <div className="absolute left-1/2 top-full w-px h-12 bg-slate-800 -translate-x-1/2"></div>
              </div>

              {/* Horizontal connector */}
              <div className="relative flex justify-center w-full mb-2">
                <div className="absolute top-0 h-px bg-slate-800" style={{ left: '16.666%', right: '16.666%' }}></div>
              </div>

              {/* Level 2: Servers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 relative pt-4">
                {registryData.slice(0, nodeLimit).map((server) => (
                  <div key={server.id} className="flex flex-col items-center">
                    {/* Vertical line down to server */}
                    <div className="w-px h-8 bg-slate-800"></div>
                    <ServerNode server={server} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ServerNode({ server }: { server: RegistryServer }) {
  return (
    <div className="flex flex-col items-center w-48">
      {/* Server Node */}
      <div className="z-10 flex flex-col items-center gap-2 px-5 py-3 bg-[#0c1322] border border-slate-800 rounded-xl shadow-lg w-full transition-all duration-200 ease-in-out hover:-translate-y-1 hover:border-slate-700 hover:shadow-[0_0_15px_rgba(122,134,153,0.05)]">
        <ServerIcon size={18} className="text-secondary" />
        <div className="text-center">
          <div className="font-semibold text-primary text-sm">{server.hostname}</div>
          <div className="text-[11px] font-mono text-slate-500 mt-1 tracking-tight">{server.ipAddress}</div>
        </div>
      </div>

      {/* Ports Container */}
      {server.applications && server.applications.length > 0 && (
        <>
          <div className="w-px h-8 bg-slate-800"></div>
          <div className="relative flex justify-center w-full">
            {server.applications.length > 1 && (
              <div className="absolute top-0 h-px bg-slate-800" style={{ left: '25%', right: '25%' }}></div>
            )}
            <div className="flex gap-4 justify-center">
              {server.applications.map(app => (
                <div key={app.id} className="flex flex-col items-center">
                  <div className="w-px h-6 bg-slate-800"></div>
                  <div className="z-10 flex items-center gap-2 px-3 py-1.5 bg-[#0c1322] border border-slate-800 rounded-lg text-primary hover:border-slate-700 hover:bg-[#11192e] transition-all duration-200 shadow-sm">
                    <Plug size={11} className="text-tertiary/70" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-secondary/80 font-medium">{app.name}</span>
                      <span className="font-mono text-[11px] font-bold text-tertiary tracking-tighter">{app.port}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
