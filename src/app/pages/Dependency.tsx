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

function DependencyManagerContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const entityId = searchParams.get("entityId");
  const type = searchParams.get("type");
  const envParam = searchParams.get("environment");
  const hasInitialized = useRef(false);
  const reactFlowInstance = useReactFlow();

  const {
    nodes, setNodes, edges, setEdges, onNodesChange, onEdgesChange, onConnect, onDrop, onDragOver,
    onSelectionChange, isLoading, availableApps, isAppsLoading, selectedItem, setSelectedItem,
    rightPanelData, setRightPanelData,
    selectedEnv, setSelectedEnv, selectedDatacenter, setSelectedDatacenter,
    handleAutoMap,
    isDrawingServer, setIsDrawingServer, drawBox,
    onPaneMouseDown, onPaneMouseMove, onPaneMouseUp,
    canDrawServer,
    onReconnect,
    handleSync,
    isSyncing,
    exportGroupAuditMatrix,
    addGroupBox,
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
        sessionStorage.removeItem('dependencyGraphState'); // Clear old session
        
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
      } else {
        // PRIORITY 2: State Persistence (Restore)
        const cached = sessionStorage.getItem('dependencyGraphState');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            
            // Restore exact state variables
            if (parsed.selectedItem) setSelectedItem(parsed.selectedItem);
            if (parsed.rightPanelData) setRightPanelData(parsed.rightPanelData);
            if (parsed.selectedEnv) setSelectedEnv(parsed.selectedEnv);
            if (parsed.selectedDatacenter) setSelectedDatacenter(parsed.selectedDatacenter);
            
            if (parsed.nodes && parsed.nodes.length > 0) {
              setNodes(parsed.nodes);
            }
            if (parsed.edges && parsed.edges.length > 0) {
              setEdges(parsed.edges);
            }
            
            // Restore camera position if a node was selected
            if (parsed.selectedItem?.id) {
              setTimeout(() => {
                reactFlowInstance.fitView({ nodes: [{ id: parsed.selectedItem.id }], duration: 800, padding: 0.5 });
              }, 100);
            }
          } catch (e) {
            console.error("Failed to parse cached dependency graph state", e);
          }
        }
      }
    }, [entityId, handleAutoMap, setSearchParams, setNodes, setEdges, reactFlowInstance, onSelectionChange, setSelectedItem, setRightPanelData, setSelectedEnv, setSelectedDatacenter]);

    // Hook 2: Save state to Session Storage continuously
    useEffect(() => {
      if (hasInitialized.current && (nodes.length > 0 || edges.length > 0)) {
        sessionStorage.setItem('dependencyGraphState', JSON.stringify({
          nodes,
          edges,
          selectedItem,
          rightPanelData,
          selectedEnv,
          selectedDatacenter
        }));
      }
    }, [nodes, edges, selectedItem, rightPanelData, selectedEnv, selectedDatacenter]);

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
          />
          <SubToolbar
            onAutoMap={handleAutoMap}
            onSync={handleSync}
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
              isDrawingServer={isDrawingServer}
              drawBox={drawBox}
              onPaneMouseDown={onPaneMouseDown}
              onPaneMouseMove={onPaneMouseMove}
              onPaneMouseUp={onPaneMouseUp}
              onAddGroup={addGroupBox}
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
