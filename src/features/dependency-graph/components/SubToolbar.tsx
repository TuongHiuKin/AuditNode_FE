import { Database, CloudUpload, Loader2 } from "lucide-react";
import { Button } from "../../../shared/ui/Button";
import { useWorkspaceCapabilities } from "../../../shared/workspace/useWorkspaceCapabilities";
import { useWorkspace } from "../../../shared/workspace/WorkspaceContext";

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
  const { canEditGraph: canEditInventory } = useWorkspaceCapabilities();
  const { selectedWorkspace } = useWorkspace();
  const canAddNodes = canEditInventory && selectedWorkspace?.effectiveRole !== "auditor";

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
        disabled={!canEditInventory} 
        variant="outline"
        title={!canEditInventory ? "Bạn không có quyền thao tác" : undefined}
      >
        <Database size={14} className="group-hover:animate-pulse text-muted-foreground" />
        Auto-Map from DB
      </Button>

      <Button 
        onClick={onSync} 
        disabled={isSyncing || !canEditInventory} 
        variant="primary"
        title={!canEditInventory ? "Bạn không có quyền thao tác" : undefined}
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
