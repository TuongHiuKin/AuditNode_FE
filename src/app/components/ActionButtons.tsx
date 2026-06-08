import { Edit2, Network, Trash2 } from "lucide-react";

interface ActionButtonsProps {
  onDepClick?: () => void;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
}

export function ActionButtons({ onDepClick, onEditClick, onDeleteClick }: ActionButtonsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEditClick?.();
        }}
        className="p-1.5 text-secondary hover:text-primary hover:bg-surface rounded-md transition-colors"
        title="Edit"
      >
        <Edit2 size={16} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDepClick?.();
        }}
        className="p-1.5 text-secondary hover:text-tertiary hover:bg-tertiary/10 rounded-md transition-colors"
        title="View Dependency"
      >
        <Network size={16} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDeleteClick?.();
        }}
        className="p-1.5 text-secondary hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
