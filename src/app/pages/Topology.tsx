import { Network } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "react-router";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useTopologyLogic } from "../../features/dependency-graph/hooks/useTopologyLogic";
import { TopologyCanvas } from "../../features/dependency-graph/components/TopologyCanvas";
import { FilterBar } from "../../features/dependency-graph/components/FilterBar";
import { DetailsPanel } from "../../features/dependency-graph/components/DetailsPanel";
import { useHeader } from "../hooks/useHeader";
import { SearchResultType } from "../components/UniversalSearch";

function TopologyContent() {
  const {
    nodes, edges, onNodesChange, onEdgesChange,
    onSelectionChange, onNodeDoubleClick, refetch, isLoading, selectedItem, setSelectedItem,
    rightPanelData, setRightPanelData,
    selectedEnv, setSelectedEnv, selectedDatacenter, setSelectedDatacenter,
    selectedLabels, setSelectedLabels,
    appSearchQuery, setAppSearchQuery,
  } = useTopologyLogic();

  const { setCenter, getNodes } = useReactFlow();

  const handleSelectResult = (id: string, _type: SearchResultType) => {
    const targetNode = getNodes().find(n => n.id === id);
    if (targetNode) {
      // Calculate center based on position and dimensions
      const width = targetNode.measured?.width ?? (targetNode.data as any).width ?? 280;
      const height = targetNode.measured?.height ?? (targetNode.data as any).height ?? 80;
      
      const centerX = targetNode.position.x + width / 2;
      const centerY = targetNode.position.y + height / 2;

      // Animated pan to the node
      setCenter(centerX, centerY, { zoom: 1.2, duration: 800 });

      // Highlight the node by selecting it
      setSelectedItem({ type: 'server', id: targetNode.id });
      setRightPanelData({ server: (targetNode.data as any).server });

      // Update search input to match selected node name
      const nodeName = (targetNode.data as any).server?.hostname || "Selected Node";
      setAppSearchQuery(nodeName);
    }
  };

  const { setHeader } = useHeader();
  const location = useLocation();

  // Automatically refresh data on every navigation to this page
  useEffect(() => {
    refetch();
  }, [location.pathname, refetch]);

  useEffect(() => {
    setHeader(
      ["TOPOLOGY", "NETWORK MAP"],
      "Topology Network Map",
      "Static resource inventory with nested server containers.",
      <Network size={20} />
    );
  }, [setHeader]);

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative font-body">
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
            query={appSearchQuery}
            onQueryChange={setAppSearchQuery}
            onSelectResult={handleSelectResult}
          />
          
          <div className="text-[10px] font-bold text-muted-foreground bg-surface/50 px-3 h-[34px] rounded-lg border border-border uppercase tracking-widest flex items-center gap-2 font-label">
            <Network size={14} className="text-primary" />
            Total Assets: {nodes.filter(n => n.type === "topologyServerNode").length}
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
