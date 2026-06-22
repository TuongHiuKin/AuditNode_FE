import { Server as ServerIcon, Maximize } from "lucide-react";
import { Handle, Position, NodeProps, useReactFlow, NodeResizer } from "@xyflow/react";
import { ServerNode } from "../types";

export function ServerGroupNode({ id, data, selected, width, height }: NodeProps<ServerNode>) {
  const { getNodes, setNodes } = useReactFlow();
  
  const handleAutoFit = (e: React.MouseEvent) => {
    e.stopPropagation();
    const childApps = getNodes().filter(n => n.parentId === id);
    if (childApps.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    childApps.forEach(node => {
      const { x, y } = node.position;
      const w = node.measured?.width ?? 240; // Default width for AppNode
      const h = node.measured?.height ?? 44; // Default height for AppNode

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    const padding = 40;
    const topPadding = 60; // Leave space for header
    
    // Calculate required dimensions
    const newWidth = Math.max(maxX + padding, 280);
    const newHeight = Math.max(maxY + padding, 120);

    // If children have negative relative coordinates, shift them
    const offsetX = minX < padding ? padding - minX : 0;
    const offsetY = minY < topPadding ? topPadding - minY : 0;

    setNodes(nodes => nodes.map(n => {
      if (n.parentId === id) {
        return {
          ...n,
          position: {
            x: n.position.x + offsetX,
            y: n.position.y + offsetY
          }
        };
      }
      if (n.id === id) {
        return {
          ...n,
          style: { ...n.style, width: newWidth, height: newHeight },
          data: { ...n.data, width: newWidth, height: newHeight }
        };
      }
      return n;
    }));
  };

  return (
    <div
      className={`border border-dashed rounded-xl transition-all duration-200 ease-in-out relative flex flex-col ${
        selected ? "border-primary bg-primary/5" : "border-border bg-surface/30 hover:bg-surface/50 hover:border-border/80"
      }`}
      style={{ 
        width: width ? `${width}px` : (data.width ? `${data.width}px` : '280px'), 
        height: height ? `${height}px` : (data.height ? `${data.height}px` : '120px') 
      }}
    >
      <NodeResizer 
        isVisible={selected} 
        minWidth={200} 
        minHeight={100} 
        lineStyle={{ border: 'none' }}
        handleStyle={{ 
          width: 8, 
          height: 8, 
          borderRadius: '2px',
          background: 'var(--color-primary)',
          border: 'none',
          margin: 0 // Ensures handles sit perfectly on the border
        }}
      />

      {/* Header Container */}
      <div className="absolute -top-8 left-0 flex items-center gap-2 px-1 w-full">
        <div className="p-1 bg-surface border border-border rounded shadow-sm">
          <ServerIcon size={12} className="text-muted-foreground" />
        </div>
        <span className="text-xs font-bold text-foreground font-display whitespace-nowrap">
          {data.server.hostname}
        </span>
        <span className="text-[10px] font-label text-muted-foreground/80 bg-background px-1.5 py-0.5 rounded border border-border uppercase tracking-tight">
          {data.server.ipAddress}
        </span>
        
        <button 
          onClick={handleAutoFit}
          title="Auto-fit to children"
          className="ml-auto p-1 bg-surface border border-border rounded hover:bg-border hover:text-foreground text-muted-foreground/80 transition-colors shadow-sm flex items-center justify-center"
        >
          <Maximize size={10} />
        </button>
      </div>

      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

