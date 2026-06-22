import { Server as ServerIcon, ChevronDown, ChevronUp, Boxes } from "lucide-react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import type { TopologyServerNode as TopologyServerNodeData } from "../topology-types";
import { TopologyAppCard } from "./TopologyAppCard";

export function TopologyServerNode({ id, data }: NodeProps<TopologyServerNodeData>) {
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
  const borderClass = isProd ? "border-primary/60" : "border-border";
  const glowClass = isProd ? "shadow-[0_0_20px_oklch(0.62_0.22_25/0.15)]" : "";
  const iconBgBorder = isProd ? "bg-primary/10 border-primary/20" : "bg-background border-border/50";
  const iconColor = isProd ? "text-primary" : "text-muted-foreground/80";

  // ─── Collapsed State ──────────────────────────────────────────────────
  if (!data.isExpanded) {
    return (
      <div
        className={`bg-surface border ${borderClass} ${glowClass} rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg transition-all duration-300 hover:scale-[1.02] group relative cursor-pointer`}
        style={{ width: 280, height: 80 }}
        onClick={toggleExpand}
      >
        <div className={`p-2 rounded-lg shrink-0 ${iconBgBorder}`}>
          <ServerIcon size={18} className={iconColor} />
        </div>
        <div className="flex flex-col overflow-hidden flex-1 min-w-0">
          <span className="font-bold text-foreground truncate text-sm tracking-tight leading-tight">
            {data.server.hostname}
          </span>
          <span className="text-[10px] font-label text-muted-foreground bg-background self-start px-1.5 py-0.5 rounded mt-0.5">
            {data.server.ipAddress}
          </span>
        </div>

        {/* App Count Badge */}
        <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-md px-2 py-1 shrink-0">
          <Boxes size={12} className="text-primary" />
          <span className="text-[10px] font-bold text-primary font-label">{appCount}</span>
        </div>

        {/* Expand Indicator */}
        <ChevronDown 
          size={14} 
          className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" 
        />

        <Handle type="target" position={Position.Top} className="opacity-0" />
        <Handle type="source" position={Position.Bottom} className="opacity-0" />
      </div>
    );
  }

  // ─── Expanded State ───────────────────────────────────────────────────
  return (
    <div
      className={`bg-surface/95 backdrop-blur-sm border ${borderClass} ${glowClass} rounded-2xl flex flex-col relative transition-all duration-300 shadow-2xl`}
      style={{ width: data.width, minHeight: data.height }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border/50 cursor-pointer group shrink-0"
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg shrink-0 ${iconBgBorder}`}>
            <ServerIcon size={16} className={iconColor} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-foreground text-sm tracking-tight leading-tight truncate">
              {data.server.hostname}
            </span>
            <span className="text-[10px] font-label text-muted-foreground">{data.server.ipAddress}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] font-label text-muted-foreground uppercase tracking-wider">
            {appCount} app{appCount !== 1 ? "s" : ""}
          </span>
          <ChevronUp
            size={14}
            className="text-muted-foreground group-hover:text-primary transition-colors"
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
          <div className="flex items-center justify-center h-full text-muted-foreground/60 text-[11px] font-label italic">
            No applications registered
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}
