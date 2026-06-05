import { Server as ServerIcon, ChevronDown, ChevronUp, Boxes } from "lucide-react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import type { TopologyServerNode as TopologyServerNodeData } from "../topology-types";
import { TopologyAppCard } from "./TopologyAppCard";

export function TopologyServerNode({ id, data, style }: NodeProps<TopologyServerNodeData>) {
  const { setNodes } = useReactFlow();

  const apps = (data as any).apps || [];
  const appCount = apps.length || (data as any).appCount || 0;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = !data.isExpanded;

    // Calculate expanded size based on number of apps (2-column grid)
    const rows = Math.ceil(appCount / 2);
    const expandedHeight = Math.max(200, 100 + rows * 72 + 16); // header + rows + padding
    const expandedWidth = 400;

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              isExpanded: newExpanded,
              width: newExpanded ? expandedWidth : 280,
              height: newExpanded ? expandedHeight : 80,
            },
          };
        }
        return node;
      })
    );
  };

  const handleAppDoubleClick = (app: any) => {
    // Dispatch custom event so the parent topology logic can pick it up
    const event = new CustomEvent("topology-app-dblclick", {
      detail: { app, serverId: id, server: data.server },
    });
    window.dispatchEvent(event);
  };

  const isProd = data.server.environment?.toUpperCase() === "PROD";
  const accentColor = isProd ? "blue" : "slate";
  const borderClass = isProd ? "border-blue-500/60" : "border-slate-700/60";
  const glowClass = isProd ? "shadow-[0_0_20px_rgba(59,130,246,0.15)]" : "";

  // ─── Collapsed State ──────────────────────────────────────────────────
  if (!data.isExpanded) {
    return (
      <div
        className={`bg-[#0c1322] border ${borderClass} ${glowClass} rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg transition-all duration-300 hover:scale-[1.02] group relative cursor-pointer`}
        style={{ ...style, width: 280, height: 80 }}
        onClick={toggleExpand}
      >
        <div className={`p-2 rounded-lg bg-slate-900 border border-${accentColor}-500/20 shrink-0`}>
          <ServerIcon size={18} className={isProd ? "text-blue-400" : "text-slate-400"} />
        </div>
        <div className="flex flex-col overflow-hidden flex-1 min-w-0">
          <span className="font-bold text-primary truncate text-sm tracking-tight leading-tight">
            {data.server.hostname}
          </span>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-900/50 self-start px-1.5 py-0.5 rounded mt-0.5">
            {data.server.ipAddress}
          </span>
        </div>

        {/* App Count Badge */}
        <div className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 rounded-md px-2 py-1 shrink-0">
          <Boxes size={12} className="text-blue-400" />
          <span className="text-[10px] font-bold text-blue-400 font-mono">{appCount}</span>
        </div>

        {/* Expand Indicator */}
        <ChevronDown 
          size={14} 
          className="text-slate-500 group-hover:text-blue-400 transition-colors shrink-0" 
        />

        <Handle type="target" position={Position.Top} className="opacity-0" />
        <Handle type="source" position={Position.Bottom} className="opacity-0" />
      </div>
    );
  }

  // ─── Expanded State ───────────────────────────────────────────────────
  return (
    <div
      className={`bg-[#0c1322]/95 backdrop-blur-sm border ${borderClass} ${glowClass} rounded-2xl flex flex-col relative transition-all duration-300 shadow-2xl`}
      style={{ ...style, width: data.width, minHeight: data.height }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50 cursor-pointer group shrink-0"
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg bg-slate-900 border border-${accentColor}-500/20 shrink-0`}>
            <ServerIcon size={16} className={isProd ? "text-blue-400" : "text-slate-400"} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-primary text-sm tracking-tight leading-tight truncate">
              {data.server.hostname}
            </span>
            <span className="text-[10px] font-mono text-slate-500">{data.server.ipAddress}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
            {appCount} app{appCount !== 1 ? "s" : ""}
          </span>
          <ChevronUp
            size={14}
            className="text-slate-500 group-hover:text-blue-400 transition-colors"
          />
        </div>
      </div>

      {/* Apps Grid */}
      <div className="flex-1 p-3 overflow-hidden">
        {apps.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {apps.map((app: any) => (
              <TopologyAppCard
                key={app.id}
                app={app}
                onDoubleClick={handleAppDoubleClick}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-600 text-[11px] font-mono italic">
            No applications registered
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}
