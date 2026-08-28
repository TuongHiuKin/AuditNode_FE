import React, { memo, useState } from 'react';
import { Handle, Position, NodeResizer, NodeProps, useReactFlow } from '@xyflow/react';
import { Briefcase, MoreVertical, FileSpreadsheet, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '../../../shared/workspace/WorkspaceContext';

export type GroupNodeData = {
  label: string;
  onExportAudit?: (id: string, label: string) => void;
};

const GroupNode = ({ id, data, selected }: NodeProps<any>) => {
  const [showMenu, setShowMenu] = useState(false);
  const label = data.label || "Infrastructure Cluster";
  const { setNodes } = useReactFlow();
  const { selectedWorkspace } = useWorkspace();
  const canMutateGroup = selectedWorkspace?.effectiveRole !== "auditor";

  const handleDelete = () => {
    setShowMenu(false);
    toast.success("Đã xoá Group");
    setNodes((nds) => {
      const remaining = nds.filter((n) => n.id !== id);
      return remaining.map((n) => {
        if (n.parentId === id) {
          return {
            ...n,
            parentId: undefined,
            extent: undefined,
          };
        }
        return n;
      });
    });
  };

  return (
    <div className={`relative h-full w-full rounded-xl border-2 border-dashed transition-all duration-300 ${
      selected 
        ? "border-primary bg-primary/5 shadow-[0_0_20px_oklch(0.62_0.22_25/0.1)]" 
        : "border-border bg-surface/10 hover:border-border/80"
    }`}>
      {/* Node Resizer */}
      <NodeResizer 
        color="var(--color-primary)" 
        isVisible={selected && canMutateGroup}
        minWidth={200} 
        minHeight={150} 
        handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
      />

      {/* Header Label */}
      <div className="absolute -top-3 left-4 px-2 py-0.5 bg-background border border-border rounded flex items-center gap-2 z-10">
        <Briefcase size={12} className="text-primary" />
        <span className="text-[10px] font-label font-bold text-foreground uppercase tracking-widest">
          {label}
        </span>
      </div>

      {/* Context Menu Trigger */}
      <div className="absolute top-2 right-2 z-20 nodrag">
        <button 
          onContextMenu={(e) => {
            e.preventDefault();
            setShowMenu(!showMenu);
          }}
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 hover:bg-surface rounded transition-colors text-muted-foreground hover:text-foreground"
        >
          <MoreVertical size={14} />
        </button>

        {showMenu && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowMenu(false)}
              onContextMenu={(e) => { e.preventDefault(); setShowMenu(false); }}
            />
            <div className="absolute right-0 top-full mt-1 w-56 bg-surface border border-border rounded-lg shadow-2xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-1 duration-150">
              <button
                onClick={() => {
                  setShowMenu(false);
                  data.onExportAudit?.(id, label);
                }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-medium text-foreground hover:bg-background transition-colors"
              >
                <FileSpreadsheet size={14} className="text-success" />
                Export Group Audit Matrix
              </button>
              {canMutateGroup && <button
                onClick={handleDelete}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors border-t border-border"
              >
                <Trash2 size={14} />
                Delete Group
              </button>}
            </div>
          </>
        )}
      </div>

      {/* Hidden Handles for React Flow logic compatibility */}
      <Handle type="target" position={Position.Top} className="opacity-0 pointer-events-none" />
      <Handle type="source" position={Position.Bottom} className="opacity-0 pointer-events-none" />
    </div>
  );
};

export default memo(GroupNode);
