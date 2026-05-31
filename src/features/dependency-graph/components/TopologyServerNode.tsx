import { Server as ServerIcon, Plus, Minus, Info } from "lucide-react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import type { TopologyServerNode as TopologyServerNodeData } from "../topology-types";

export function TopologyServerNode({ id, data }: NodeProps<TopologyServerNodeData>) {
  const { setNodes } = useReactFlow();

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = !data.isExpanded;
    
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              isExpanded: newExpanded,
              width: newExpanded ? 420 : 240,
              height: newExpanded ? 320 : 90,
            },
          };
        }
        return node;
      })
    );
  };

  const isProd = data.server.environment?.toUpperCase() === "PROD";
  const borderColor = isProd ? "border-blue-500" : "border-slate-800";
  const glowColor = isProd ? "shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "";

  if (!data.isExpanded) {
    return (
      <div
        className={`bg-[#0c1322] border-2 ${borderColor} ${glowColor} rounded-xl px-4 py-3 flex flex-col justify-center min-w-[240px] h-[90px] shadow-lg transition-all hover:scale-105 group relative`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-slate-900 border ${borderColor}/30`}>
            <ServerIcon size={18} className={isProd ? "text-blue-400" : "text-slate-400"} />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold text-primary truncate text-sm tracking-tight">
              {data.server.hostname}
            </span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-900/50 self-start px-1 rounded">
              {data.server.ipAddress}
            </span>
          </div>
        </div>

        {/* Toggle Button - Collapsed */}
        <button
          onClick={toggleExpand}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#0c1322] border border-slate-700 hover:border-blue-500 rounded-full px-3 py-1 text-[10px] font-bold text-blue-400 flex items-center gap-1.5 shadow-xl transition-all hover:scale-110 active:scale-95 z-20"
        >
          <Plus size={10} strokeWidth={3} />
          {data.appCount || 0} Apps
        </button>
      </div>
    );
  }

  return (
    <div
      className={`bg-[#0c1322]/40 backdrop-blur-sm border-2 ${borderColor} ${glowColor} rounded-2xl flex flex-col relative transition-all shadow-2xl`}
      style={{ width: data.width, height: data.height }}
    >
      {/* Expanded Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-slate-900 border ${borderColor}/30`}>
            <ServerIcon size={16} className={isProd ? "text-blue-400" : "text-slate-400"} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-primary text-sm tracking-tight">{data.server.hostname}</span>
            <span className="text-[10px] font-mono text-slate-500">{data.server.ipAddress}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
             className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 transition-colors"
             title="Show Details"
           >
             <Info size={14} />
           </button>
        </div>
      </div>

      {/* Children Container Area */}
      <div className="flex-1 p-6 relative">
        <div className="absolute inset-0 border-4 border-dashed border-slate-800/20 rounded-xl m-4 pointer-events-none" />
      </div>

      {/* Toggle Button - Expanded (Fixed at Bottom Center) */}
      <button
        onClick={toggleExpand}
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-full px-3 py-1 text-[10px] font-bold text-slate-300 shadow-xl transition-all hover:scale-110 active:scale-95 z-20"
      >
        <Minus size={10} strokeWidth={2.5} />
        Collapse
      </button>

      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}
