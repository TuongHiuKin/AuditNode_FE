import { Info, X, ArrowRight } from "lucide-react";
import { SelectedItem } from "../types";

interface DetailsPanelProps {
  selectedItem: SelectedItem;
  rightPanelData: any;
  onClose: () => void;
}

export function DetailsPanel({ selectedItem, rightPanelData, onClose }: DetailsPanelProps) {
  return (
    <div
      className={`flex-shrink-0 h-full overflow-hidden bg-panel shadow-xl transition-all duration-300 ease-in-out z-20 flex flex-col ${
        selectedItem.id
          ? "w-80 md:w-96 border-l border-border opacity-100"
          : "w-0 border-l-0 opacity-0"
      }`}
    >
      <div className="w-80 md:w-96 min-w-[20rem] md:min-w-[24rem] flex flex-col h-full">
      <div className="p-5 border-b border-border bg-panel shrink-0 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2 font-display uppercase tracking-tight">
          <Info size={16} className="text-primary" /> Details Panel
        </h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {/* App Node Details */}
        {selectedItem.type === "node" && rightPanelData?.app && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-widest mb-3">
                Infrastructure
              </h3>
              <div className="bg-surface border border-border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Server Name</span>
                  <span className="text-sm font-medium text-foreground">
                    {rightPanelData.server?.hostname ?? "Unassigned"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">IP Address</span>
                  <span className="text-sm text-primary font-label">
                    {rightPanelData.server?.ipAddress ?? "N/A"}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-widest mb-3">
                Application
              </h3>
              <div className="bg-surface border border-border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">App Name</span>
                  <span className="text-sm font-medium text-foreground">{rightPanelData.app.appName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Port</span>
                  <span className="text-sm font-label text-foreground">{rightPanelData.app.portNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Tech Stack</span>
                  <span className="text-sm font-medium text-foreground">{rightPanelData.app.techStack}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Owner</span>
                  <span className="text-sm font-medium text-foreground">{rightPanelData.app.ownerId}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edge Details */}
        {selectedItem.type === "edge" && rightPanelData?.sourceApp && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-widest mb-3">
                Connection Route
              </h3>
              <div className="flex flex-col gap-2">
                <div className="bg-surface border border-border rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-foreground">{rightPanelData.sourceApp.appName}</p>
                  <p className="text-[10px] text-muted-foreground/80 mt-1 font-label">
                    PORT: {rightPanelData.sourceApp.portNumber}
                  </p>
                </div>
                <div className="flex justify-center text-primary">
                  <ArrowRight size={16} />
                </div>
                <div className="bg-surface border border-border rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-foreground">{rightPanelData.targetApp.appName}</p>
                  <p className="text-[10px] text-muted-foreground/80 mt-1 font-label">
                    PORT: {rightPanelData.targetApp.portNumber}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">Protocol</span>
                <span className="text-sm font-medium text-foreground uppercase">
                  {rightPanelData.protocol ?? "TCP"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">Target Port</span>
                <span className="text-sm text-primary font-label">
                  {rightPanelData.targetApp.portNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">Status</span>
                <span className="text-sm font-bold text-success flex items-center gap-1 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" /> Active
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Server Node Details */}
        {selectedItem.type === "server" && rightPanelData?.server && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-widest mb-3">
                Server Info
              </h3>
              <div className="bg-surface border border-border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Server Name</span>
                  <span className="text-sm font-medium text-foreground">{rightPanelData.server.hostname}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">IP Address</span>
                  <span className="text-sm text-primary font-label">
                    {rightPanelData.server.ipAddress}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
