import { ArrowRight } from "lucide-react";
import { SelectedItem } from "../types";
import { SlidePanel } from "../../../shared/ui/SlidePanel";
import { DataSection, DataCard, DataRow } from "../../../shared/ui/DataCard";

interface DetailsPanelProps {
  selectedItem: SelectedItem;
  rightPanelData: any;
  onClose: () => void;
}

export function DetailsPanel({ selectedItem, rightPanelData, onClose }: DetailsPanelProps) {
  return (
    <SlidePanel 
      isOpen={!!selectedItem.id} 
      onClose={onClose} 
      title="Details Panel"
    >
        {/* App Node Details */}
        {selectedItem.type === "node" && rightPanelData?.app && (
          <div className="space-y-6">
            <DataSection title="Infrastructure">
              <DataCard>
                <DataRow label="Server Name" value={rightPanelData.server?.hostname ?? "Unassigned"} />
                <DataRow label="IP Address" value={rightPanelData.server?.ipAddress ?? "N/A"} valueClassName="text-primary font-label" />
              </DataCard>
            </DataSection>
            <DataSection title="Application">
              <DataCard>
                <DataRow label="App Name" value={rightPanelData.app.appName} />
                <DataRow label="Port" value={rightPanelData.app.portNumber} valueClassName="font-label" />
                <DataRow label="Tech Stack" value={rightPanelData.app.techStack} />
                <DataRow label="Owner" value={rightPanelData.app.ownerId} />
              </DataCard>
            </DataSection>
          </div>
        )}

        {/* Edge Details */}
        {selectedItem.type === "edge" && rightPanelData?.sourceApp && (
          <div className="space-y-6">
            <DataSection title="Connection Route">
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
            </DataSection>
            <DataCard className="rounded-xl">
              <DataRow label="Protocol" value={rightPanelData.protocol ?? "TCP"} valueClassName="uppercase" />
              <DataRow label="Target Port" value={rightPanelData.targetApp.portNumber} valueClassName="text-primary font-label" />
              <DataRow 
                label="Status" 
                value={
                  <span className="flex items-center gap-1 uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" /> Active
                  </span>
                } 
                valueClassName="text-success font-bold" 
              />
            </DataCard>
          </div>
        )}

        {/* Server Node Details */}
        {selectedItem.type === "server" && rightPanelData?.server && (
          <div className="space-y-6">
            <DataSection title="Server Info">
              <DataCard>
                <DataRow label="Server Name" value={rightPanelData.server.hostname} />
                <DataRow label="IP Address" value={rightPanelData.server.ipAddress} valueClassName="text-primary font-label" />
              </DataCard>
            </DataSection>
          </div>
        )}
    </SlidePanel>
  );
}
