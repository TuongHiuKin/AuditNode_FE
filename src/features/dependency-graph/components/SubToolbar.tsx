import { Database, CloudUpload, Loader2 } from "lucide-react";
import { Button } from "../../../shared/ui/Button";

interface SubToolbarProps {
  onAutoMap: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
  onTogglePalette?: () => void;
  isPaletteOpen?: boolean;
  canEditGraph: boolean;
  canAddNodes: boolean;
}

export function SubToolbar({ 
  onAutoMap, 
  onSync,
  isSyncing = false,
  onTogglePalette,
  isPaletteOpen = false,
  canEditGraph,
  canAddNodes,
}: SubToolbarProps) {

  return (
    <div className="flex items-center gap-3">
      {onTogglePalette && (
        <Button
          onClick={onTogglePalette}
          disabled={!canAddNodes}
          title={!canAddNodes ? "Auditors cannot add graph nodes" : undefined}
          variant={isPaletteOpen ? "active" : "outline"}
        >
          <Database size={14} className={isPaletteOpen ? "text-primary" : "text-muted-foreground"} />
          + App Palette
        </Button>
      )}

      <Button 
        onClick={onAutoMap} 
        disabled={!canEditGraph}
        variant="outline"
        title={!canEditGraph ? "Bạn không có quyền thao tác" : undefined}
      >
        <Database size={14} className="group-hover:animate-pulse text-muted-foreground" />
        Auto-Map from DB
      </Button>

      <Button 
        onClick={onSync} 
        disabled={isSyncing || !canEditGraph}
        variant="primary"
        title={!canEditGraph ? "Bạn không có quyền thao tác" : undefined}
      >
        {isSyncing ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <CloudUpload size={16} className="group-hover:scale-110 transition-transform" />
        )}
        {isSyncing ? "Syncing..." : "Save Network State"}
      </Button>
    </div>
  );
}
