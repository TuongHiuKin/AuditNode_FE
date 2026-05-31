import { Network } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "react-router";
import { ReactFlowProvider } from "@xyflow/react";
import { useTopologyLogic } from "../../features/dependency-graph/hooks/useTopologyLogic";
import { TopologyCanvas } from "../../features/dependency-graph/components/TopologyCanvas";
import { FilterBar } from "../../features/dependency-graph/components/FilterBar";
import { DetailsPanel } from "../../features/dependency-graph/components/DetailsPanel";
import { useHeader } from "../hooks/useHeader";

function TopologyContent() {
  const {
    nodes, edges, onNodesChange, onEdgesChange,
    onSelectionChange, onNodeDoubleClick, refetch, isLoading, selectedItem, setSelectedItem,
    rightPanelData, setRightPanelData,
    selectedEnv, setSelectedEnv, selectedDatacenter, setSelectedDatacenter,
  } = useTopologyLogic();

  const { setHeader } = useHeader();
  const location = useLocation();

  // Automatically refresh data on every navigation to this page
  useEffect(() => {
    refetch();
  }, [location.pathname, refetch]);

  useEffect(() => {
    setHeader(
      "Topology Network Map",
      "Static Resource Inventory view with nested server containers and auto-layout.",
      <Network size={20} />
    );
  }, [setHeader]);

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative font-body">
      <div className="flex flex-col h-full overflow-hidden relative flex-1 min-w-0">
        
        {/* Top Utility Bar */}
        <div className="bg-surface/90 backdrop-blur-md border-b border-border flex items-center gap-3 px-4 py-2 z-10 shadow-sm shrink-0 min-h-[3.5rem]">
          <FilterBar
            selectedEnv={selectedEnv}
            setSelectedEnv={setSelectedEnv}
            selectedDatacenter={selectedDatacenter}
            setSelectedDatacenter={setSelectedDatacenter}
          />
          <div className="ml-auto text-[10px] font-mono text-secondary bg-slate-900/50 px-2 py-1 rounded border border-border">
            Inventory Assets: {nodes.filter(n => n.type === "topologyServerNode").length}
          </div>
        </div>

        {/* Canvas + Details Panel Row */}
        <div className="flex flex-row flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 h-full relative min-w-0">
            <TopologyCanvas
              nodes={nodes} 
              edges={edges} 
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange} 
              onSelectionChange={onSelectionChange}
              onNodeDoubleClick={onNodeDoubleClick}
              isLoading={isLoading}
            />
          </div>

          {/* Details Panel - Strictly opens on double-click */}
          <DetailsPanel
            selectedItem={selectedItem}
            rightPanelData={rightPanelData}
            onClose={() => { setSelectedItem({ type: null, id: null }); setRightPanelData(null); }}
          />
        </div>
      </div>
    </div>
  );
}

export function Topology() {
  return (
    <ReactFlowProvider>
      <TopologyContent />
    </ReactFlowProvider>
  );
}
