import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  DefaultEdgeOptions,
  type NodeTypes,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AppNode } from "./AppNode";
import { ServerGroupNode } from "./ServerGroupNode";
import { GraphToolbar } from "./GraphToolbar";
import { RemovableEdge } from "./RemovableEdge";
import { FloatingSmoothStepEdge } from "./FloatingSmoothStepEdge";

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'floatingSmooth',
  animated: true,
  style: { strokeWidth: 2, stroke: "#3b82f6", strokeDasharray: '5,5' },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: "#3b82f6",
  },
};

interface FlowCanvasProps {
  nodes: any[];
  edges: any[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: any;
  onReconnect?: any;
  onDrop: any;
  onDragOver: any;
  onSelectionChange: any;
  isLoading: boolean;
  onQuickAdd?: () => void;
  isDrawingServer?: boolean;
  drawBox?: { startX: number; startY: number; currentX: number; currentY: number } | null;
  onPaneMouseDown?: (event: React.MouseEvent) => void;
  onPaneMouseMove?: (event: React.MouseEvent) => void;
  onPaneMouseUp?: () => void;
}

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onReconnect,
  onDrop,
  onDragOver,
  onSelectionChange,
  isLoading,
  onQuickAdd,
  isDrawingServer,
  drawBox,
  onPaneMouseDown,
  onPaneMouseMove,
  onPaneMouseUp,
}: FlowCanvasProps) {
  const nodeTypes: NodeTypes = useMemo(() => ({
    appNode: AppNode,
    serverNode: ServerGroupNode,
  }), []);

  const edgeTypes = useMemo(() => ({
    removable: RemovableEdge,
    floatingSmooth: FloatingSmoothStepEdge,
  }), []);

  return (
    <div
      className={`relative w-full h-full bg-background ${isDrawingServer ? "cursor-crosshair" : ""}`}
      onMouseDown={onPaneMouseDown}
      onMouseMove={onPaneMouseMove}
      onMouseUp={onPaneMouseUp}
    >
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-secondary">
            <div className="w-8 h-8 border-2 border-border border-t-tertiary rounded-full animate-spin" />
            <span className="text-sm font-label uppercase">Building dependency graph...</span>
          </div>
        </div>
      )}

      {/* Drawing Box Overlay */}
      {drawBox && (
        <div
          className="absolute z-50 border-2 border-tertiary bg-tertiary/10 pointer-events-none rounded-lg"
          style={{
            left: Math.min(drawBox.startX, drawBox.currentX),
            top: Math.min(drawBox.startY, drawBox.currentY),
            width: Math.abs(drawBox.currentX - drawBox.startX),
            height: Math.abs(drawBox.currentY - drawBox.startY),
            transform: 'none', // Ensure it stays in flow space if wrapped, but here we need to handle coordinate mapping carefully if it's absolute to the viewport
          }}
        />
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        isValidConnection={(connection) => connection.source !== connection.target}
        onSelectionChange={onSelectionChange}
        onDrop={onDrop}
        onDragOver={onDragOver}

        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionRadius={30}
        fitView
        className="bg-background"
        colorMode="dark"
        minZoom={0.2}
        maxZoom={2}
        panOnDrag={true}
        selectionOnDrag={false}
      >
        <Background color="#1e293b" gap={20} size={1} variant={BackgroundVariant.Dots} />
        <GraphToolbar onQuickAdd={onQuickAdd} />
        <MiniMap
          nodeColor={(n) => (n.type === "serverNode" ? "#0c1322" : "#FF4D7E")}
          maskColor="rgba(5, 8, 17, 0.7)"
          className="bg-[#0c1322] border border-slate-800 rounded-lg overflow-hidden"
        />
      </ReactFlow>
    </div>
  );
}

