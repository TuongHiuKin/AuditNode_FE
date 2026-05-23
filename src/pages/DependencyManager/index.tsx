import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useDependencyLogic } from "../../features/dependency-graph/hooks/useDependencyLogic";
import { FlowCanvas } from "../../features/dependency-graph/components/FlowCanvas";
import { PaletteSidebar } from "../../features/dependency-graph/components/PaletteSidebar";
import { DetailsPanel } from "../../features/dependency-graph/components/DetailsPanel";
import { FilterBar } from "../../features/dependency-graph/components/FilterBar";
import { SubToolbar } from "../../features/dependency-graph/components/SubToolbar";
import { RegisterModal } from "../../app/components/RegisterModal";

function DependencyManagerContent() {
  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect, onDrop, onDragOver,
    onSelectionChange, isLoading, paletteApps, selectedItem, setSelectedItem,
    rightPanelData, setRightPanelData,
    selectedEnv, setSelectedEnv, selectedDatacenter, setSelectedDatacenter,
    handleAutoMap,
  } = useDependencyLogic();

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative font-body">

      <PaletteSidebar paletteApps={paletteApps} />
      
      {/* Main Canvas Workspace */}
      <div className="flex-1 flex flex-col relative">
        {/* Docked Utility Toolbar */}
        <div className="h-14 bg-surface/90 backdrop-blur-md border-b border-border flex items-center justify-between px-4 z-10 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <SubToolbar 
              onAddServer={() => setIsRegisterModalOpen(true)}
              onAddDatacenter={() => console.log("Add Datacenter")}
              onAutoMap={handleAutoMap}
            />
          </div>
          <FilterBar
            selectedEnv={selectedEnv}
            setSelectedEnv={setSelectedEnv}
            selectedDatacenter={selectedDatacenter}
            setSelectedDatacenter={setSelectedDatacenter}
          />
        </div>

        <div className="flex-1 relative">
          <FlowCanvas
            nodes={nodes} edges={edges} onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange} onConnect={onConnect}
            onDrop={onDrop} onDragOver={onDragOver}
            onSelectionChange={onSelectionChange} isLoading={isLoading}
            onQuickAdd={() => setIsRegisterModalOpen(true)}
          />
        </div>
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
