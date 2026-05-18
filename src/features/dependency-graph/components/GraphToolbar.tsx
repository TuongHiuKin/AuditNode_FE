import { Controls } from "@xyflow/react";
import { Camera, Plus } from "lucide-react";
import { toPng } from "html-to-image";

interface GraphToolbarProps {
  onQuickAdd?: () => void;
}

export function GraphToolbar({ onQuickAdd }: GraphToolbarProps) {
  const handleExport = () => {
    const flowElement = document.querySelector(".react-flow__viewport") as HTMLElement;
    if (!flowElement) return;

    toPng(flowElement, {
      backgroundColor: "#020617",
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
        <button
          onClick={handleExport}
          title="Export Canvas to PNG"
          className="p-2.5 text-secondary hover:text-tertiary hover:bg-background transition-all border-b border-border"
        >
          <Camera size={18} />
        </button>
        <button
          onClick={onQuickAdd}
          title="Quick Add Infrastructure"
          className="p-2.5 text-secondary hover:text-tertiary hover:bg-background transition-all"
        >
          <Plus size={18} />
        </button>
      </div>

      <Controls
        className="!m-0 !static !shadow-none !border-none !bg-transparent"
        showInteractive={false}
      />
    </div>
  );
}
