import React, { memo, useState } from 'react';
import { Handle, Position, NodeResizer, NodeProps } from '@xyflow/react';
import { Briefcase, MoreVertical, FileSpreadsheet } from 'lucide-react';

export type GroupNodeData = {
  label: string;
  onExportAudit?: (id: string, label: string) => void;
};

const GroupNode = ({ id, data, selected }: NodeProps<any>) => {
  const [showMenu, setShowMenu] = useState(false);
  const label = data.label || "Infrastructure Cluster";

  return (
    <div className={`relative h-full w-full rounded-xl border-2 border-dashed transition-all duration-300 ${
      selected 
        ? "border-tertiary bg-tertiary/5 shadow-[0_0_20px_rgba(255,77,126,0.1)]" 
        : "border-slate-700 bg-slate-900/10 hover:border-slate-500"
    }`}>
      {/* Node Resizer */}
      <NodeResizer 
        color="#ff4d7e" 
        isVisible={selected} 
        minWidth={200} 
        minHeight={150} 
        handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
      />

      {/* Header Label */}
      <div className="absolute -top-3 left-4 px-2 py-0.5 bg-background border border-slate-800 rounded flex items-center gap-2 z-10">
        <Briefcase size={12} className="text-tertiary" />
        <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-widest">
          {label}
        </span>
      </div>

      {/* Context Menu Trigger */}
      <div className="absolute top-2 right-2 z-20">
        <button 
          onContextMenu={(e) => {
            e.preventDefault();
            setShowMenu(!showMenu);
          }}
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-500 hover:text-white"
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
                className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-medium text-primary hover:bg-background transition-colors"
              >
                <FileSpreadsheet size={14} className="text-green-500" />
                Export Group Audit Matrix
              </button>
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
