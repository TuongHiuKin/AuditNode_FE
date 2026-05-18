import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useDependencyLogic } from "../../features/dependency-graph/hooks/useDependencyLogic";
import { FlowCanvas } from "../../features/dependency-graph/components/FlowCanvas";
import { PaletteSidebar } from "../../features/dependency-graph/components/PaletteSidebar";
import { DetailsPanel } from "../../features/dependency-graph/components/DetailsPanel";
import { FilterBar } from "../../features/dependency-graph/components/FilterBar";
import { RegisterModal } from "../../app/components/RegisterModal";

function DependencyManagerContent() {
  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect, onDrop, onDragOver,
    onSelectionChange, isLoading, paletteApps, selectedItem, setSelectedItem,
    rightPanelData, setRightPanelData,
    selectedEnv, setSelectedEnv, selectedDatacenter, setSelectedDatacenter,
  } = useDependencyLogic();

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative font-body">
      {/* Performance Filter Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
        <FilterBar
          selectedEnv={selectedEnv}
          setSelectedEnv={setSelectedEnv}
          selectedDatacenter={selectedDatacenter}
          setSelectedDatacenter={setSelectedDatacenter}
        />
      </div>

      <PaletteSidebar paletteApps={paletteApps} />
      
      <div className="flex-1 relative">
        <FlowCanvas
          nodes={nodes} edges={edges} onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange} onConnect={onConnect}
          onDrop={onDrop} onDragOver={onDragOver}
          onSelectionChange={onSelectionChange} isLoading={isLoading}
          onQuickAdd={() => setIsRegisterModalOpen(true)}
        />
      </div>

      <DetailsPanel
        selectedItem={selectedItem}
        rightPanelData={rightPanelData}
        onClose={() => { setSelectedItem({ type: null, id: null }); setRightPanelData(null); }}
      />

      {isRegisterModalOpen && (
        <RegisterModal
          onClose={() => setIsRegisterModalOpen(false)}
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
