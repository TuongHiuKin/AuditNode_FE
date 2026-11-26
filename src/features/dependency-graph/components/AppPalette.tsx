import { Workflow, GripVertical, Globe, CreditCard, Shield, Database, Zap, X } from "lucide-react";
import { PaletteApp, PaletteExternalService } from "@/features/dependency-graph/types";

const ICONS: Record<string, any> = { CreditCard, Shield, Database, Zap, Globe };

interface AppPaletteProps {
  availableApps: PaletteApp[];
  availableExternalServices?: PaletteExternalService[];
  isLoading: boolean;
  onClose?: () => void;
  readOnly?: boolean;
}

export function AppPalette({ availableApps, availableExternalServices = [], isLoading, onClose, readOnly = false }: AppPaletteProps) {
  return (
    <div className="w-72 bg-surface border-r border-border flex flex-col h-full shadow-2xl z-20">
      <div className="p-4 border-b border-border bg-background flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2 font-display uppercase tracking-tight">
            <Workflow size={16} className="text-primary" /> App Palette
          </h2>
          <p className="text-[10px] text-muted-foreground mt-1 font-label uppercase">Drag apps onto the canvas.</p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-surface rounded-md text-muted-foreground hover:text-foreground transition-colors"
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
              <Workflow size={20} className="text-muted-foreground opacity-20" />
            </div>
            <p className="text-xs text-muted-foreground font-medium font-body leading-relaxed">
              All applications are currently mapped on the canvas.
            </p>
          </div>
        ) : (
          availableApps.map((app) => {
            const Icon = ICONS[app.icon] || Globe;
            return (
              <div
                key={app.id}
                draggable={!readOnly}
                onDragStart={(e) => {
                  if (readOnly) { e.preventDefault(); return; }
                  e.dataTransfer.setData("application/reactflow", app.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className={`flex items-center gap-3 p-2.5 bg-background border border-border rounded-lg transition-colors shadow-sm group ${readOnly ? "cursor-not-allowed opacity-60" : "cursor-grab hover:border-primary/50 hover:bg-surface/50"}`}
              >
                <Icon size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                <p className="text-sm font-medium text-foreground truncate flex-1 font-body">{app.appName}</p>
                <GripVertical size={14} className="text-muted-foreground shrink-0" />
              </div>
            );
          })
        )}
        {availableExternalServices.length > 0 && (
          <>
            <div className="mt-4 mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              External services
            </div>
            {availableExternalServices.map((service) => (
              <div
                key={service.id}
                draggable={!readOnly}
                onDragStart={(event) => {
                  if (readOnly) { event.preventDefault(); return; }
                  event.dataTransfer.setData("external-service/reactflow", service.id);
                  event.dataTransfer.effectAllowed = "move";
                }}
                title={service.provider ?? undefined}
                className={`flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-2.5 transition-colors ${readOnly ? "cursor-not-allowed opacity-60" : "cursor-grab hover:border-primary/60"}`}
              >
                <Globe size={16} className="shrink-0 text-primary" />
                <span className="flex-1 truncate">
                  <span className="block truncate text-sm font-medium text-foreground">{service.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {service.kind}
                    {service.endpoint ? ` · ${service.endpoint}` : ""}
                    {service.port ? `:${service.port}` : ""}
                  </span>
                </span>
                <GripVertical size={14} className="shrink-0 text-muted-foreground" />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
