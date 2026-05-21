import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  DefaultEdgeOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AppNode } from "./AppNode";
import { ServerGroupNode } from "./ServerGroupNode";
import { GraphToolbar } from "./GraphToolbar";

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'default', // Bezier is default in ReactFlow
  animated: true,
  style: { strokeWidth: 2, stroke: "#3b82f6" },
};

interface FlowCanvasProps {
  nodes: any[];
  edges: any[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: any;
  onDrop: any;
  onDragOver: any;
  onSelectionChange: any;
  isLoading: boolean;
  onQuickAdd?: () => void;
}

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDrop,
  onDragOver,
  onSelectionChange,
  isLoading,
  onQuickAdd,
}: FlowCanvasProps) {
  const nodeTypes = useMemo(() => ({
    appNode: AppNode,
    serverNode: ServerGroupNode,
  }), []);

  return (
    <div className="relative w-full h-full bg-background">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-secondary">
            <div className="w-8 h-8 border-2 border-border border-t-tertiary rounded-full animate-spin" />
            <span className="text-sm font-label uppercase">Building dependency graph...</span>
          </div>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        className="bg-background"
        colorMode="dark"
        minZoom={0.2}
        maxZoom={2}
      >
        <Background color="#141828" gap={24} size={1.5} />
        <GraphToolbar onQuickAdd={onQuickAdd} />
        <MiniMap
          nodeColor={(n) => (n.type === "serverNode" ? "#141828" : "#FF4D7E")}
          maskColor="rgba(11, 14, 26, 0.7)"
          className="bg-surface border border-border rounded-lg overflow-hidden"
        />
      </ReactFlow>
    </div>
  );
}

