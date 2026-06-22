import { Database, CloudUpload, Loader2 } from "lucide-react";

interface SubToolbarProps {
  onAutoMap: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
  onTogglePalette?: () => void;
  isPaletteOpen?: boolean;
}

export function SubToolbar({ 
  onAutoMap, 
  onSync,
  isSyncing = false,
  onTogglePalette,
  isPaletteOpen = false
}: SubToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      {onTogglePalette && (
        <button
          onClick={onTogglePalette}
          className={`flex items-center gap-2 px-4 h-[34px] text-sm font-bold rounded-lg transition-all border ${
            isPaletteOpen 
              ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(229,67,95,0.2)]" 
              : "bg-surface hover:bg-surface-hover border-border text-foreground shadow-sm"
          }`}
        >
          <Database size={14} className={isPaletteOpen ? "text-primary" : "text-muted-foreground"} />
          + App Palette
        </button>
      )}

      <button
        onClick={onAutoMap}
        className="flex items-center gap-2 px-4 h-[34px] text-sm font-bold bg-surface hover:bg-surface-hover text-foreground border border-border rounded-lg transition-all shadow-sm group"
      >
        <Database size={14} className="group-hover:animate-pulse text-muted-foreground" />
        Auto-Map from DB
      </button>

      <button
        onClick={onSync}
        disabled={isSyncing}
        className="flex items-center gap-2 px-4 h-[34px] text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all shadow-[0_0_15px_oklch(0.62_0.22_25/0.2)] group disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isSyncing ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <CloudUpload size={16} className="group-hover:scale-110 transition-transform" />
        )}
        {isSyncing ? "Syncing..." : "Save Network State"}
      </button>
    </div>
  );
}
