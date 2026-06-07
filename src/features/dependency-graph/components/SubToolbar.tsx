import { Database, CloudUpload, Loader2 } from "lucide-react";

interface SubToolbarProps {
  onAutoMap: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
}

export function SubToolbar({ 
  onAutoMap, 
  onSync,
  isSyncing = false 
}: SubToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onAutoMap}
        className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold bg-tertiary hover:bg-tertiary/90 text-primary-foreground rounded-md transition-all shadow-[0_0_15px_rgba(255,77,126,0.2)] group"
      >
        <Database size={14} className="group-hover:animate-pulse" />
        Auto-Map from DB
      </button>

      <div className="w-px h-4 bg-border mx-1"></div>

      <button
        onClick={onSync}
        disabled={isSyncing}
        className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)] group disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isSyncing ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <CloudUpload size={14} className="group-hover:scale-110 transition-transform" />
        )}
        {isSyncing ? "Syncing..." : "Save Network State"}
      </button>
    </div>
  );
}
