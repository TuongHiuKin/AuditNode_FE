import { Edit2, Network, Trash2 } from "lucide-react";
import type { CatalogCapabilities } from "../../shared/catalog/types";

interface ActionButtonsProps {
  onDepClick?: () => void;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
  capabilities?: Pick<CatalogCapabilities, "canEditProperties" | "canDelete">;
}

export function ActionButtons({ onDepClick, onEditClick, onDeleteClick, capabilities }: ActionButtonsProps) {
  const canEditInventory = capabilities?.canEditProperties === true;
  const canDelete = capabilities?.canDelete === true;

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
          if (canDelete) onDeleteClick?.();
        }}
        disabled={!canDelete}
        className={`p-1.5 rounded-md transition-colors ${
          canDelete
            ? "text-muted-foreground hover:text-danger hover:bg-danger/10"
            : "text-muted-foreground/40 cursor-not-allowed"
        }`}
        title={!canDelete ? "Bạn không có quyền xóa tài nguyên này" : "Delete"}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
