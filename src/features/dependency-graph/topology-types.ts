import { type Node, type Edge } from "@xyflow/react";

export interface TopologyLabelData {
  id: string;
  key: string;
  value: string;
  colorHex?: string;
}

export interface TopologyAppData {
  id: string;
  appName: string;
  portNumber: number;
  protocol: string;
  risk?: string;
  icon?: string;
}

export interface TopologyServerNodeData extends Record<string, unknown> {
  entityId: string;
  server: {
    hostname: string;
    ipAddress: string;
    osType?: string;
    environment?: string;
    status?: string;
  };
  apps: TopologyAppData[];
  labels: TopologyLabelData[];
  isExpanded?: boolean;
  appCount?: number;
  width: number;
  height: number;
  isDuplicated?: boolean;
  isGhost?: boolean;
}

export interface TopologyLabelGroupNodeData extends Record<string, unknown> {
  label: TopologyLabelData;
  serverCount: number;
  width: number;
  height: number;
}

export type TopologyServerNode = Node<TopologyServerNodeData, "topologyServerNode">;
export type TopologyLabelGroupNode = Node<TopologyLabelGroupNodeData, "topologyLabelGroupNode">;
export type TopologyNode = TopologyServerNode | TopologyLabelGroupNode;
export type TopologyEdge = Edge;
