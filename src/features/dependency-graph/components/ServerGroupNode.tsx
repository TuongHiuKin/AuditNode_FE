import { Server as ServerIcon } from "lucide-react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { ServerNodeData } from "../types";

export function ServerGroupNode({ id, data, selected }: NodeProps<ServerNodeData>) {
  const { getNodes } = useReactFlow();
  
  // Dynamic Bounds: Calculate height based on child application nodes to prevent overlap
  const childApps = getNodes().filter(n => n.parentId === id);
  const appCount = childApps.length;
  
  // Base dimensions + incremental space per child
  const dynamicWidth = data.width || 280;
  const dynamicHeight = Math.max(data.height || 120, 80 + (appCount * 60));

  return (
    <div
      className={`border border-dashed rounded-xl transition-all duration-200 ease-in-out relative flex flex-col ${
        selected ? "border-tertiary bg-tertiary/5" : "border-slate-800 bg-[#0c1322]/30 hover:bg-[#0c1322]/50 hover:border-slate-700"
      }`}
      style={{ width: dynamicWidth, height: dynamicHeight }}
    >
      {/* Header Container */}
      <div className="absolute -top-8 left-0 flex items-center gap-2 px-1">
        <div className="p-1 bg-[#0c1322] border border-slate-800 rounded shadow-sm">
          <ServerIcon size={12} className="text-secondary" />
        </div>
        <span className="text-xs font-bold text-primary font-display whitespace-nowrap">
          {data.server.hostname}
        </span>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 uppercase tracking-tight">
          {data.server.ipAddress}
        </span>
        {data.server.osType && (
          <span className="text-[10px] font-mono text-secondary/60 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 uppercase tracking-tight">
            {data.server.osType}
          </span>
        )}
      </div>

      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

