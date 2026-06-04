import { Workflow, GripVertical, Globe, CreditCard, Shield, Database, Zap, X } from "lucide-react";
import { PaletteApp } from "../types";

const ICONS: Record<string, any> = { CreditCard, Shield, Database, Zap, Globe };

interface AppPaletteProps {
  availableApps: PaletteApp[];
  isLoading: boolean;
  onClose?: () => void;
}

export function AppPalette({ availableApps, isLoading, onClose }: AppPaletteProps) {
  return (
    <div className="w-72 bg-surface border-r border-border flex flex-col h-full shadow-2xl z-20">
      <div className="p-4 border-b border-border bg-background flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-primary flex items-center gap-2 font-display uppercase tracking-tight">
            <Workflow size={16} className="text-tertiary" /> App Palette
          </h2>
          <p className="text-[10px] text-secondary mt-1 font-label uppercase">Drag apps onto the canvas.</p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-surface rounded-md text-secondary hover:text-primary transition-colors"
            aria-label="Close Palette"
          >
            <X size={18} />
          </button>
        )}
      </div>
      <div className="p-3 space-y-2 overflow-y-auto flex-1">
        {isLoading ? (
          <div className="flex flex-col gap-2 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-background/60 rounded-lg" />
            ))}
          </div>
        ) : availableApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mb-3 border border-border">
              <Workflow size={20} className="text-secondary opacity-20" />
            </div>
            <p className="text-xs text-secondary font-medium font-body leading-relaxed">
              All applications are currently mapped on the canvas.
            </p>
          </div>
        ) : (
          availableApps.map((app) => {
            const Icon = ICONS[app.icon] || Globe;
            return (
              <div
                key={app.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/reactflow", app.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="flex items-center gap-3 p-2.5 bg-background border border-border rounded-lg cursor-grab hover:border-tertiary/50 hover:bg-surface/50 transition-colors shadow-sm group"
              >
                <Icon size={16} className="text-secondary group-hover:text-primary transition-colors" />
                <p className="text-sm font-medium text-primary truncate flex-1 font-body">{app.appName}</p>
                <GripVertical size={14} className="text-secondary shrink-0" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
