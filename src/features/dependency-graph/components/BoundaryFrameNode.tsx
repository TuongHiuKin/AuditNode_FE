import { memo } from "react";
import { NodeProps, NodeResizer, NodeToolbar, Position, useReactFlow } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const BoundaryFrameNode = memo(({ id, data, selected }: NodeProps) => {
  const { setNodes } = useReactFlow();

  const handleDelete = () => {
    setNodes((nodes) => {
      const remaining = nodes.filter((node) => node.id !== id);
      return remaining.map((node) => node.parentId === id
        ? { ...node, parentId: undefined, extent: undefined }
        : node);
    });
    toast.success("Boundary Frame removed. Save network state to persist it.");
  };

  return (
    <>
      <NodeToolbar
        isVisible={selected}
        position={Position.Top}
        className="flex gap-2 bg-panel border border-border p-1.5 rounded-lg shadow-xl"
      >
        <button
          className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors"
          onClick={() => console.log("Exporting Frame:", id)}
        >
          Export
        </button>
        <button
          className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-destructive/10 text-destructive hover:bg-destructive/20 rounded transition-colors flex items-center gap-1"
          onClick={handleDelete}
        >
          <Trash2 size={12} />
          Xoá
        </button>
      </NodeToolbar>

      <NodeResizer minWidth={300} minHeight={250} isVisible={selected} lineClassName="border-primary" />
      <div className="w-full h-full min-w-[300px] min-h-[250px] bg-primary/5 border-2 border-dashed border-primary/40 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden backdrop-blur-sm pointer-events-none">
        <div className="custom-drag-handle bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between pointer-events-auto cursor-grab active:cursor-grabbing">
          <span className="text-[11px] font-bold text-primary tracking-widest uppercase">
            {(data?.name as string) || "Boundary Frame"}
          </span>
        </div>
        <div className="flex-1" />
      </div>
    </>
  );
});
