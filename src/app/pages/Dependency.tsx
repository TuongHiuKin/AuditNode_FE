import { useState, useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Network, ChevronRight, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDependencyLogic } from "../../features/dependency-graph/hooks/useDependencyLogic";
import { FlowCanvas } from "../../features/dependency-graph/components/FlowCanvas";
import { AppPalette } from "../../features/dependency-graph/components/AppPalette";
import { DetailsPanel } from "../../features/dependency-graph/components/DetailsPanel";
import { FilterBar } from "../../features/dependency-graph/components/FilterBar";
import { SubToolbar } from "../../features/dependency-graph/components/SubToolbar";
import { RegisterModal } from "../components/RegisterModal";
import { useHeader } from "../hooks/useHeader";

function DependencyManagerContent() {
  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect, onDrop, onDragOver,
    onSelectionChange, isLoading, availableApps, isAppsLoading, selectedItem, setSelectedItem,
    rightPanelData, setRightPanelData,
    selectedEnv, setSelectedEnv, selectedDatacenter, setSelectedDatacenter,
    handleAutoMap,
    isDrawingServer, setIsDrawingServer, drawBox,
    onPaneMouseDown, onPaneMouseMove, onPaneMouseUp,
    canDrawServer,
    } = useDependencyLogic();

    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const { setHeader } = useHeader();
    const queryClient = useQueryClient();

    const refreshData = () => {
      queryClient.invalidateQueries({ queryKey: ["dependency-map"] });
      queryClient.invalidateQueries({ queryKey: ["all-servers"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    };

    useEffect(() => {
      setHeader(
        "Dependency Graph Manager",
        "Visualize and manage inter-service dependencies and network flows.",
        <Network size={20} />
      );
    }, [setHeader]);

    return (
    <div className="flex h-full w-full bg-background overflow-hidden relative font-body">

      {/* App Palette Drawer Wrapper */}
      <div 
        className={`absolute top-0 left-0 h-full z-30 transition-transform duration-300 ease-in-out ${
          isPaletteOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <AppPalette 
          availableApps={availableApps} 
          isLoading={isAppsLoading} 
          onClose={() => setIsPaletteOpen(false)}
        />
      </div>

      {/* Main Viewport Wrapper */}
      <div className="flex flex-col h-full overflow-hidden relative flex-1 min-w-0">

        {/* Docked Utility Toolbar - always full width */}
        <div className="bg-surface/90 backdrop-blur-md border-b border-border flex items-center gap-3 px-4 py-2 z-10 shadow-sm shrink-0 min-h-[3.5rem]">
          <SubToolbar
            onAddServer={() => setIsDrawingServer(true)}
            onAddDatacenter={() => console.log("Add Datacenter")}
            onAutoMap={handleAutoMap}
            isDrawingServer={isDrawingServer}
            canDrawServer={canDrawServer}
          />
          <div className="w-px h-5 bg-border shrink-0"></div>
          <FilterBar
            selectedEnv={selectedEnv}
            setSelectedEnv={setSelectedEnv}
            selectedDatacenter={selectedDatacenter}
            setSelectedDatacenter={setSelectedDatacenter}
          />
        </div>

        {/* Canvas + Details Panel Row */}
        <div className="flex flex-row flex-1 min-h-0 overflow-hidden relative">
          {/* Toggle Button for Palette (Floating) */}
          {!isPaletteOpen && (
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg shadow-xl hover:scale-105 active:scale-95 transition-all font-bold text-xs uppercase tracking-wider"
              title="Open App Palette"
            >
              <Plus size={16} />
              <span>Apps</span>
              <ChevronRight size={14} className="opacity-50" />
            </button>
          )}

          {/* React Flow Canvas Wrapper */}
          <div className="flex-1 h-full relative min-w-0">
            <FlowCanvas
              nodes={nodes} edges={edges} onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange} onConnect={onConnect}
              onDrop={onDrop} onDragOver={onDragOver}
              onSelectionChange={onSelectionChange} isLoading={isLoading}
              isDrawingServer={isDrawingServer}
              drawBox={drawBox}
              onPaneMouseDown={onPaneMouseDown}
              onPaneMouseMove={onPaneMouseMove}
              onPaneMouseUp={onPaneMouseUp}
            />
          </div>

          {/* Details Panel */}
          <DetailsPanel
            selectedItem={selectedItem}
            rightPanelData={rightPanelData}
            onClose={() => { setSelectedItem({ type: null, id: null }); setRightPanelData(null); }}
          />
        </div>
      </div>

      {isRegisterModalOpen && (
        <RegisterModal
          onClose={() => setIsRegisterModalOpen(false)}
          onSuccess={refreshData}
          defaultMode="infra"
        />
      )}
    </div>
  );
}

export function DependencyManager() {
  return (
    <ReactFlowProvider>
      <DependencyManagerContent />
    </ReactFlowProvider>
  );
}
