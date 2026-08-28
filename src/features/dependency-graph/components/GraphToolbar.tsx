import { Controls } from "@xyflow/react";
import { Camera, Plus, Briefcase } from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "../../../shared/ui/Button";
import { useWorkspaceCapabilities } from "../../../shared/workspace/useWorkspaceCapabilities";
import { useWorkspace } from "../../../shared/workspace/WorkspaceContext";

interface GraphToolbarProps {
  onQuickAdd?: () => void;
  onAddGroup?: () => void;
  onAddBoundaryFrame?: () => void;
}

export function GraphToolbar({ onQuickAdd, onAddGroup, onAddBoundaryFrame }: GraphToolbarProps) {
  const { canEditGraph: canEditInventory } = useWorkspaceCapabilities();
  const { selectedWorkspace } = useWorkspace();
  const canCreateStructure = canEditInventory && selectedWorkspace?.effectiveRole !== "auditor";
  const handleExport = () => {
    const flowElement = document.querySelector(".react-flow__viewport") as HTMLElement;
    if (!flowElement) return;

    toPng(flowElement, {
      backgroundColor: "var(--color-background)",
      style: {
        transform: "none",
      },
    })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = "topology-dependency-graph.png";
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error("Export failed:", err);
      });
  };

  return (
    <div className="absolute bottom-4 left-4 z-50 flex gap-2">
      <div className="bg-surface border border-border rounded-lg flex flex-col overflow-hidden shadow-xl">
        <Button
          onClick={handleExport}
          title="Export Canvas to PNG"
          variant="ghost"
          size="icon"
          className="border-b border-border rounded-none"
        >
          <Camera size={18} />
        </Button>
        <Button
          onClick={onAddGroup}
          disabled={!canCreateStructure}
          title={!canCreateStructure ? "Auditors cannot create graph containers" : "Add Group Box"}
          variant="ghost"
          size="icon"
          className="border-b border-border rounded-none"
        >
          <Briefcase size={18} />
        </Button>
        <Button
          onClick={onAddBoundaryFrame}
          disabled={!canCreateStructure}
          title={!canCreateStructure ? "Auditors cannot create boundary frames" : "Add Boundary Frame"}
          variant="ghost"
          size="icon"
          className="border-b border-border font-bold uppercase rounded-none"
        >
          [ ]
        </Button>
        <Button
          onClick={onQuickAdd}
          disabled={!canCreateStructure}
          title={!canCreateStructure ? "Auditors cannot add graph nodes" : "Quick Add Infrastructure"}
          variant="ghost"
          size="icon"
          className="rounded-none"
        >
          <Plus size={18} />
        </Button>
      </div>

      <Controls
        className="!m-0 !static !shadow-none !border-none !bg-transparent"
        showInteractive={false}
      />
    </div>
  );
}
