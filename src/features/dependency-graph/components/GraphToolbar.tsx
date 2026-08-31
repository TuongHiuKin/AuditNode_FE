import { Controls } from "@xyflow/react";
import { Camera, Plus, Briefcase } from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "../../../shared/ui/Button";

interface GraphToolbarProps {
  onQuickAdd?: () => void;
  onAddGroup?: () => void;
  onAddBoundaryFrame?: () => void;
  canEditStructure?: boolean;
}

export function GraphToolbar({ onQuickAdd, onAddGroup, onAddBoundaryFrame, canEditStructure = false }: GraphToolbarProps) {
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
          disabled={!canEditStructure}
          title={!canEditStructure ? "You cannot create graph containers in this catalog view" : "Add Group Box"}
          variant="ghost"
          size="icon"
          className="border-b border-border rounded-none"
        >
          <Briefcase size={18} />
        </Button>
        <Button
          onClick={onAddBoundaryFrame}
          disabled={!canEditStructure}
          title={!canEditStructure ? "You cannot create boundary frames in this catalog view" : "Add Boundary Frame"}
          variant="ghost"
          size="icon"
          className="border-b border-border font-bold uppercase rounded-none"
        >
          [ ]
        </Button>
        <Button
          onClick={onQuickAdd}
          disabled={!canEditStructure}
          title={!canEditStructure ? "You cannot add graph nodes in this catalog view" : "Quick Add Infrastructure"}
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
