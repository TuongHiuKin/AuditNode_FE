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
      className={`w-[320px] bg-surface border-l border-border flex flex-col shrink-0 transition-transform duration-300 z-20 ${
        selectedItem.id ? "translate-x-0" : "translate-x-full absolute right-0 top-0 bottom-0"
      }`}
    >
      <div className="p-5 border-b border-border bg-background shrink-0 flex items-center justify-between">
        <h2 className="text-sm font-bold text-primary flex items-center gap-2 font-display uppercase tracking-tight">
          <Info size={16} className="text-tertiary" /> Details Panel
        </h2>
        <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* App Node Details */}
        {selectedItem.type === "node" && rightPanelData?.app && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-label text-secondary uppercase tracking-widest mb-3">
                Infrastructure
              </h3>
              <div className="bg-background border border-border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-secondary font-label uppercase">Server Name</span>
                  <span className="text-sm font-medium text-primary">
                    {rightPanelData.server?.hostname ?? "Unassigned"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-secondary font-label uppercase">IP Address</span>
                  <span className="text-sm font-label text-tertiary">
                    {rightPanelData.server?.ipAddress ?? "N/A"}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-[10px] font-label text-secondary uppercase tracking-widest mb-3">
                Application
              </h3>
              <div className="bg-background border border-border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-secondary font-label uppercase">App Name</span>
                  <span className="text-sm font-medium text-primary">{rightPanelData.app.appName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-secondary font-label uppercase">Port</span>
                  <span className="text-sm font-label text-primary">{rightPanelData.app.portNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-secondary font-label uppercase">Tech Stack</span>
                  <span className="text-sm font-medium text-primary">{rightPanelData.app.techStack}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-secondary font-label uppercase">Owner</span>
                  <span className="text-sm font-medium text-primary">{rightPanelData.app.ownerId}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edge Details */}
        {selectedItem.type === "edge" && rightPanelData?.sourceApp && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-label text-secondary uppercase tracking-widest mb-3">
                Connection Route
              </h3>
              <div className="flex flex-col gap-2">
                <div className="bg-background border border-border rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-primary">{rightPanelData.sourceApp.appName}</p>
                  <p className="text-[10px] font-label text-secondary mt-1">
                    {rightPanelData.sourceApp.portNumber}
                  </p>
                </div>
                <div className="flex justify-center text-tertiary">
                  <ArrowRight size={16} />
                </div>
                <div className="bg-background border border-border rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-primary">{rightPanelData.targetApp.appName}</p>
                  <p className="text-[10px] font-label text-secondary mt-1">
                    {rightPanelData.targetApp.portNumber}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-background border border-border rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-secondary font-label uppercase">Protocol</span>
                <span className="text-sm font-medium text-primary uppercase">
                  {rightPanelData.protocol ?? "TCP"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-secondary font-label uppercase">Target Port</span>
                <span className="text-sm font-label text-tertiary">
                  {rightPanelData.targetApp.portNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-secondary font-label uppercase">Status</span>
                <span className="text-sm font-bold text-tertiary flex items-center gap-1 uppercase font-label">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> Active
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Server Node Details */}
        {selectedItem.type === "server" && rightPanelData?.server && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-label text-secondary uppercase tracking-widest mb-3">
                Server Info
              </h3>
              <div className="bg-background border border-border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-secondary font-label uppercase">Server Name</span>
                  <span className="text-sm font-medium text-primary">{rightPanelData.server.hostname}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-secondary font-label uppercase">IP Address</span>
                  <span className="text-sm font-label text-tertiary">
                    {rightPanelData.server.ipAddress}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
