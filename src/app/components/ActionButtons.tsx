import { Edit2, Network, Trash2 } from "lucide-react";
import { useWorkspaceCapabilities } from "../../shared/workspace/useWorkspaceCapabilities";

interface ActionButtonsProps {
  onDepClick?: () => void;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
}

export function ActionButtons({ onDepClick, onEditClick, onDeleteClick }: ActionButtonsProps) {
  const { canWriteInventory: canEditInventory } = useWorkspaceCapabilities();

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (canEditInventory) onEditClick?.();
        }}
        disabled={!canEditInventory}
        className={`p-1.5 rounded-md transition-colors ${
          canEditInventory
            ? "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
            : "text-muted-foreground/40 cursor-not-allowed"
        }`}
        title={!canEditInventory ? "Bạn không có quyền thao tác" : "Edit"}
      >
        <Edit2 size={16} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDepClick?.();
        }}
        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
        title="View Dependency"
      >
        <Network size={16} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (canEditInventory) onDeleteClick?.();
        }}
        disabled={!canEditInventory}
        className={`p-1.5 rounded-md transition-colors ${
          canEditInventory
            ? "text-muted-foreground hover:text-danger hover:bg-danger/10"
            : "text-muted-foreground/40 cursor-not-allowed"
        }`}
        title={!canEditInventory ? "Bạn không có quyền thao tác" : "Delete"}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
