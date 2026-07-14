import { Server as ServerIcon, ChevronDown, ChevronUp, Boxes, Link2 } from "lucide-react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { useState, useEffect } from "react";
import type { TopologyServerNode as TopologyServerNodeData } from "../topology-types";
import { TopologyAppCard } from "./TopologyAppCard";

export function TopologyServerNode({ id, data }: NodeProps<TopologyServerNodeData>) {
  const { setNodes } = useReactFlow();
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [isHoveredGhost, setIsHoveredGhost] = useState(false);

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
  
  const isGhost = (data as any).isGhost;
  const isDuplicated = (data as any).isDuplicated;
  const originalId = (data as any).originalId;
  const hasExternal = (data as any).hasExternal; // just a mock trigger for now
  
  const ghostOpacity = isGhost ? (isHoveredGhost ? "opacity-100" : "opacity-50") : "";
  const ghostStyle = isGhost ? "border-dashed border-2" : "";
  const duplicateStyle = isHighlighted && isDuplicated ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "";

  const borderClass = isGhost ? "border-muted-foreground" : (isProd ? "border-primary/60" : "border-border");
  const glowClass = (isProd && !isGhost) ? "shadow-[0_0_20px_oklch(0.62_0.22_25/0.15)]" : "";
  const iconBgBorder = isGhost ? "bg-background border-muted-foreground/30" : (isProd ? "bg-primary/10 border-primary/20" : "bg-background border-border/50");
  const iconColor = isGhost ? "text-muted-foreground" : (isProd ? "text-primary" : "text-muted-foreground/80");

  useEffect(() => {
    if (!isDuplicated) return;
    const handleHover = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.originalId === originalId && detail.nodeId !== id) {
        setIsHighlighted(detail.isEntering);
      }
    };
    window.addEventListener("topology-duplicate-hover", handleHover);
    return () => window.removeEventListener("topology-duplicate-hover", handleHover);
  }, [isDuplicated, originalId, id]);

  const onMouseEnter = () => {
    if (isGhost) setIsHoveredGhost(true);
    if (isDuplicated) {
      window.dispatchEvent(new CustomEvent("topology-duplicate-hover", {
        detail: { originalId, nodeId: id, isEntering: true }
      }));
    }
  };

  const onMouseLeave = () => {
    if (isGhost) setIsHoveredGhost(false);
    if (isDuplicated) {
      window.dispatchEvent(new CustomEvent("topology-duplicate-hover", {
        detail: { originalId, nodeId: id, isEntering: false }
      }));
    }
  };

  const handleExternalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("topology-load-external", {
      detail: { serverId: originalId || id }
    }));
  };

  // ─── Collapsed State ──────────────────────────────────────────────────
  if (!data.isExpanded) {
    return (
      <div
        className={`bg-surface border ${borderClass} ${glowClass} ${ghostStyle} ${ghostOpacity} ${duplicateStyle} rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg transition-all duration-300 hover:scale-[1.02] group relative cursor-pointer`}
        style={{ width: 280, height: 80 }}
        onClick={toggleExpand}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
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

        {/* External Badge */}
        {!isGhost && (
          <div 
            className="flex items-center gap-1 bg-surface border border-border hover:border-primary/50 hover:bg-primary/10 rounded-md px-2 py-1 shrink-0 ml-1 transition-colors cursor-pointer group/ext"
            onClick={handleExternalClick}
            title="Load External Dependencies"
          >
            <span className="text-[10px] font-bold text-muted-foreground group-hover/ext:text-primary transition-colors">...</span>
          </div>
        )}

        {/* Expand Indicator */}
        <ChevronDown 
          size={14} 
          className="text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-1" 
        />

        <Handle type="target" position={Position.Top} className="opacity-0" />
        <Handle type="source" position={Position.Bottom} className="opacity-0" />
      </div>
    );
  }

  // ─── Expanded State ───────────────────────────────────────────────────
  return (
    <div
      className={`bg-surface/95 backdrop-blur-sm border ${borderClass} ${glowClass} ${ghostStyle} ${ghostOpacity} ${duplicateStyle} rounded-2xl flex flex-col relative transition-all duration-300 shadow-2xl`}
      style={{ width: data.width, minHeight: data.height }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
