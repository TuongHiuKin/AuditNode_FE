import { Database, CloudUpload, Loader2 } from "lucide-react";
import { Button } from "../../../shared/ui/Button";

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
        <Button
          onClick={onTogglePalette}
          variant={isPaletteOpen ? "active" : "outline"}
        >
          <Database size={14} className={isPaletteOpen ? "text-primary" : "text-muted-foreground"} />
          + App Palette
        </Button>
      )}

      <Button onClick={onAutoMap} variant="outline">
        <Database size={14} className="group-hover:animate-pulse text-muted-foreground" />
        Auto-Map from DB
      </Button>

      <Button onClick={onSync} disabled={isSyncing} variant="primary">
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
