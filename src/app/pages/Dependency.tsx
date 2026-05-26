import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useDependencyLogic } from "../../features/dependency-graph/hooks/useDependencyLogic";
import { FlowCanvas } from "../../features/dependency-graph/components/FlowCanvas";
import { AppPalette } from "../../features/dependency-graph/components/AppPalette";
import { DetailsPanel } from "../../features/dependency-graph/components/DetailsPanel";
import { FilterBar } from "../../features/dependency-graph/components/FilterBar";
import { SubToolbar } from "../../features/dependency-graph/components/SubToolbar";
import { RegisterModal } from "../components/RegisterModal";

function DependencyManagerContent() {
  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect, onDrop, onDragOver,
    onSelectionChange, isLoading, availableApps, isAppsLoading, selectedItem, setSelectedItem,
    rightPanelData, setRightPanelData,
    selectedEnv, setSelectedEnv, selectedDatacenter, setSelectedDatacenter,
    handleAutoMap,
  } = useDependencyLogic();

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative font-body">

      <AppPalette availableApps={availableApps} isLoading={isAppsLoading} />
      
      {/* Main Viewport Wrapper */}
      <div className="flex flex-col h-full overflow-hidden relative flex-1 min-w-0">
        
        {/* Docked Utility Toolbar - always full width */}
        <div className="bg-surface/90 backdrop-blur-md border-b border-border flex items-center gap-3 px-4 py-2 z-10 shadow-sm shrink-0 min-h-[3.5rem]">
          <SubToolbar 
            onAddServer={() => setIsRegisterModalOpen(true)}
            onAddDatacenter={() => console.log("Add Datacenter")}
            onAutoMap={handleAutoMap}
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
        <div className="flex flex-row flex-1 min-h-0 overflow-hidden">
          {/* React Flow Canvas Wrapper */}
          <div className="flex-1 h-full relative min-w-0">
            <FlowCanvas
              nodes={nodes} edges={edges} onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange} onConnect={onConnect}
              onDrop={onDrop} onDragOver={onDragOver}
              onSelectionChange={onSelectionChange} isLoading={isLoading}
              onQuickAdd={() => setIsRegisterModalOpen(true)}
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
