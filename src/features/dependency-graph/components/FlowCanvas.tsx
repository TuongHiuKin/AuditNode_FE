import { useMemo, type ComponentType } from "react";
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
import GroupNode from "./GroupNode";
import ZoneNode from "./ZoneNode";
import { GraphToolbar } from "./GraphToolbar";
import { RemovableEdge } from "./RemovableEdge";
import { FloatingSmoothStepEdge } from "./FloatingSmoothStepEdge";
import { BoundaryFrameNode } from "./BoundaryFrameNode";

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'floatingSmooth',
  animated: true,
  style: { strokeWidth: 2, stroke: "var(--color-primary)", strokeDasharray: '5,5' },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: "var(--color-primary)",
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
  onAddGroup?: () => void;
  onAddBoundaryFrame?: () => void;
  onNodeDragStop?: (event: React.MouseEvent, node: any) => void;
  drawingMode?: 'server' | 'groupBox' | 'boundaryFrame' | null;
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
  onAddGroup,
  onAddBoundaryFrame,
  onNodeDragStop,
  drawingMode,
  drawBox,
  onPaneMouseDown,
  onPaneMouseMove,
  onPaneMouseUp,
}: FlowCanvasProps) {
  const nodeTypes: NodeTypes = useMemo(() => ({
    appNode: AppNode,
    serverNode: ServerGroupNode,
    groupNode: GroupNode as ComponentType<any>,
    zoneNode: ZoneNode as ComponentType<any>,
    boundaryFrame: BoundaryFrameNode,
  }), []);

  const edgeTypes = useMemo(() => ({
    removable: RemovableEdge,
    floatingSmooth: FloatingSmoothStepEdge,
  }), []);

  return (
    <div
      className={`relative w-full h-full bg-background ${drawingMode ? "cursor-crosshair" : ""}`}
      onMouseDown={onPaneMouseDown}
      onMouseMove={onPaneMouseMove}
      onMouseUp={onPaneMouseUp}
    >
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
            <span className="text-sm font-label uppercase">Building dependency graph...</span>
          </div>
        </div>
      )}

      {/* Drawing Box Overlay */}
      {drawBox && (
        <div
          className="absolute z-50 border-2 border-primary bg-primary/10 pointer-events-none rounded-lg"
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
        onNodeDragStop={onNodeDragStop}

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
        <GraphToolbar onQuickAdd={onQuickAdd} onAddGroup={onAddGroup} onAddBoundaryFrame={onAddBoundaryFrame} />
        <MiniMap
          nodeColor={(n) => (n.type === "serverNode" ? "var(--color-surface)" : "var(--color-primary)")}
          maskColor="var(--color-background)"
          className="bg-surface border border-border rounded-lg overflow-hidden"
        />
      </ReactFlow>
    </div>
  );
}

