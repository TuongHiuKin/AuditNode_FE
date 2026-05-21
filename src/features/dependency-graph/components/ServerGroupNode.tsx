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
      className={`border-2 border-dashed rounded-xl transition-all relative flex flex-col ${
        selected ? "border-tertiary bg-tertiary/5" : "border-slate-600 bg-slate-900/20"
      }`}
      style={{ width: dynamicWidth, height: dynamicHeight }}
    >
      {/* Header Container */}
      <div className="absolute -top-8 left-0 flex items-center gap-2 px-1">
        <div className="p-1 bg-surface border border-border rounded shadow-sm">
          <ServerIcon size={14} className="text-secondary" />
        </div>
        <span className="text-sm font-bold text-primary font-display whitespace-nowrap">
          {data.server.hostname}
        </span>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase">
          {data.server.ipAddress}
        </span>
      </div>

      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

