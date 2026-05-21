import { Plus, Database } from "lucide-react";

interface SubToolbarProps {
  onAddServer: () => void;
  onAddDatacenter: () => void;
  onAutoMap: () => void;
}

export function SubToolbar({ onAddServer, onAddDatacenter, onAutoMap }: SubToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-surface/80 backdrop-blur-md border border-border rounded-xl shadow-2xl">
      <button
        onClick={onAddServer}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-secondary hover:text-primary hover:bg-background border border-border rounded-lg transition-all"
      >
        <Plus size={14} /> Add Server Container
      </button>
      <button
        onClick={onAddDatacenter}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-secondary hover:text-primary hover:bg-background border border-border rounded-lg transition-all"
      >
        <Plus size={14} /> Add Datacenter Cluster
      </button>
      
      <div className="w-px h-4 bg-border mx-1"></div>
      
      <button
        onClick={onAutoMap}
        className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-[0_0_15px_rgba(5,150,105,0.3)] group"
      >
        <Database size={14} className="group-hover:animate-pulse" />
        Auto-Map from DB
      </button>
    </div>
  );
}
