import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  DefaultEdgeOptions,
  type NodeTypes,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AppNode } from "./AppNode";
import { TopologyServerNode } from "./TopologyServerNode";
import { GraphToolbar } from "./GraphToolbar";

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'default',
  animated: true,
  style: { strokeWidth: 2, stroke: "#3b82f6" },
};

interface TopologyCanvasProps {
  nodes: any[];
  edges: any[];
  onNodesChange: any;
  onEdgesChange: any;
  onSelectionChange: any;
  onNodeDoubleClick?: (event: React.MouseEvent, node: any) => void;
  isLoading: boolean;
}

export function TopologyCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onSelectionChange,
  onNodeDoubleClick,
  isLoading,
}: TopologyCanvasProps) {
  const nodeTypes: NodeTypes = useMemo(() => ({
    topologyAppNode: AppNode,
    topologyServerNode: TopologyServerNode,
  }), []);

  return (
    <div className="relative w-full h-full bg-background">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-secondary">
            <div className="w-8 h-8 border-2 border-border border-t-tertiary rounded-full animate-spin" />
            <span className="text-sm font-label uppercase">Building topology inventory...</span>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        className="bg-background"
        colorMode="dark"
        minZoom={0.1}
        maxZoom={1.5}
        nodesDraggable={false}
      >
        <Background color="#1e293b" gap={24} size={1} variant={BackgroundVariant.Dots} />
        <GraphToolbar />
        <MiniMap
          position="bottom-right"
          nodeColor={(n) => (n.type === "topologyServerNode" ? "#0c1322" : "#FF4D7E")}
          maskColor="rgba(5, 8, 17, 0.7)"
          className="bg-[#0c1322] border border-slate-800 rounded-lg overflow-hidden"
        />
      </ReactFlow>
    </div>
  );
}
