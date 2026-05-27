import { Server as ServerIcon, Maximize } from "lucide-react";
import { Handle, Position, NodeProps, useReactFlow, NodeResizer } from "@xyflow/react";
import { ServerNode } from "../types";

export function ServerGroupNode({ id, data, selected }: NodeProps<ServerNode>) {
  const { getNodes, setNodes } = useReactFlow();
  
  const handleAutoFit = (e: React.MouseEvent) => {
    e.stopPropagation();
    const childApps = getNodes().filter(n => n.parentId === id);
    if (childApps.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    childApps.forEach(node => {
      const { x, y } = node.position;
      const width = node.measured?.width ?? 180; // Fallback to standard AppNode width
      const height = node.measured?.height ?? 50; // Fallback to standard AppNode height

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    const padding = 40;
    const newWidth = (maxX - minX) + (padding * 2);
    const newHeight = (maxY - minY) + (padding * 2);

    // Adjust child positions if they have negative coordinates relative to the new origin
    if (minX < padding || minY < padding) {
        const offsetX = padding - minX;
        const offsetY = padding - minY;
        
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
                    data: { ...n.data, width: newWidth, height: newHeight }
                };
            }
            return n;
        }));
    } else {
        setNodes(nodes => nodes.map(n => {
            if (n.id === id) {
                return {
                    ...n,
                    data: { ...n.data, width: newWidth, height: newHeight }
                };
            }
            return n;
        }));
    }
  };

  // Use data.width/height if set (by resizer), otherwise use dynamic defaults
  const currentWidth = data.width || 280;
  const currentHeight = data.height || 120;

  return (
    <div
      className={`border border-dashed rounded-xl transition-all duration-200 ease-in-out relative flex flex-col ${
        selected ? "border-tertiary bg-tertiary/5" : "border-slate-800 bg-[#0c1322]/30 hover:bg-[#0c1322]/50 hover:border-slate-700"
      }`}
      style={{ width: currentWidth, height: currentHeight }}
    >
      <NodeResizer 
        isVisible={selected} 
        minWidth={200} 
        minHeight={100} 
        handleStyle={{ width: 8, height: 8, borderRadius: '50%' }}
      />

      {/* Header Container */}
      <div className="absolute -top-8 left-0 flex items-center gap-2 px-1 w-full">
        <div className="p-1 bg-[#0c1322] border border-slate-800 rounded shadow-sm">
          <ServerIcon size={12} className="text-secondary" />
        </div>
        <span className="text-xs font-bold text-primary font-display whitespace-nowrap">
          {data.server.hostname}
        </span>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 uppercase tracking-tight">
          {data.server.ipAddress}
        </span>
        
        <button 
          onClick={handleAutoFit}
          title="Auto-fit to children"
          className="ml-auto p-1 bg-[#0c1322] border border-slate-800 rounded hover:bg-slate-800 hover:text-white text-slate-400 transition-colors shadow-sm flex items-center justify-center"
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

