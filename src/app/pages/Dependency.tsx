import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
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
import { useWorkspace } from "../../shared/workspace/WorkspaceContext";
import { tenantQueryKey } from "../../shared/workspace/workspaceStore";

function DependencyManagerContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const entityId = searchParams.get("entityId");
  const type = searchParams.get("type");
  const envParam = searchParams.get("environment");
  const hasInitialized = useRef(false);
  const reactFlowInstance = useReactFlow();

  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect, onDrop, onDragOver,
    onSelectionChange, isLoading, availableApps, isAppsLoading, selectedItem, setSelectedItem,
    rightPanelData, setRightPanelData,
    selectedEnv, setSelectedEnv, selectedDatacenter, setSelectedDatacenter,
    selectedLabels, setSelectedLabels,
    handleAutoMap,
    drawingMode, setDrawingMode, drawBox,
    onPaneMouseDown, onPaneMouseMove, onPaneMouseUp,
    canDrawServer,
    onReconnect,
    handleSync,
    handleSaveNetworkState,
    isSyncing,
    exportGroupAuditMatrix,
    addGroupBox,
    addBoundaryFrame,
    onNodeDragStop,
    } = useDependencyLogic();

    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const { setHeader } = useHeader();
    const queryClient = useQueryClient();
    const { selectedWorkspaceId } = useWorkspace();

    const refreshData = () => {
      queryClient.invalidateQueries({ queryKey: tenantQueryKey("dependency-map", selectedWorkspaceId) });
      queryClient.invalidateQueries({ queryKey: tenantQueryKey("all-servers", selectedWorkspaceId) });
      queryClient.invalidateQueries({ queryKey: tenantQueryKey("applications", selectedWorkspaceId) });
    };

    useEffect(() => {
      setHeader(
        ["DEPENDENCIES", "GRAPH MANAGER"],
        "Dependency Graph Manager",
        "Visualize and manage inter-service dependencies and network flows.",
        <Network size={20} />
      );
    }, [setHeader]);

    // Hook 1: Initialize from Deep Link or Session Storage
    useEffect(() => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      if (entityId) {
        // PRIORITY 1: Deep Linking
        handleAutoMap(envParam || undefined).then(() => {
          // Clear URL parameters to prevent re-triggering on refresh
          setSearchParams({});
          
          // Focus the specific entity node once the graph settles
          setTimeout(() => {
            const targetNode = reactFlowInstance.getNode(entityId);
            if (targetNode) {
              onSelectionChange({ nodes: [targetNode], edges: [] });
              reactFlowInstance.fitView({ nodes: [{ id: entityId }], duration: 800, padding: 0.5 });
            }
          }, 500);
        });
      }
    }, [entityId, envParam, handleAutoMap, onSelectionChange, reactFlowInstance, setSearchParams]);

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

        {/* Top Utility Bar */}
        <div className="bg-surface/90 backdrop-blur-md border-b border-border flex items-center justify-between px-8 pt-8 pb-3 z-10 shrink-0">
          <FilterBar
            selectedEnv={selectedEnv}
            setSelectedEnv={setSelectedEnv}
            selectedDatacenter={selectedDatacenter}
            setSelectedDatacenter={setSelectedDatacenter}
            selectedLabels={selectedLabels}
            setSelectedLabels={setSelectedLabels}
          />
          <SubToolbar
            onAutoMap={handleAutoMap}
            onSync={handleSaveNetworkState}
            isSyncing={isSyncing}
            onTogglePalette={() => setIsPaletteOpen(!isPaletteOpen)}
            isPaletteOpen={isPaletteOpen}
          />
        </div>

        {/* Canvas + Details Panel Row */}
        <div className="flex flex-row flex-1 min-h-0 overflow-hidden relative">

          {/* React Flow Canvas Wrapper */}
          <div className="flex-1 h-full relative min-w-0">
            <FlowCanvas
              nodes={nodes} edges={edges} onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange} onConnect={onConnect}
              onReconnect={onReconnect}
              onDrop={onDrop} onDragOver={onDragOver}
              onSelectionChange={onSelectionChange} isLoading={isLoading}
              drawingMode={drawingMode}
              drawBox={drawBox}
              onPaneMouseDown={onPaneMouseDown}
              onPaneMouseMove={onPaneMouseMove}
              onPaneMouseUp={onPaneMouseUp}
              onAddGroup={addGroupBox}
              onAddBoundaryFrame={addBoundaryFrame}
              onNodeDragStop={onNodeDragStop}
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
