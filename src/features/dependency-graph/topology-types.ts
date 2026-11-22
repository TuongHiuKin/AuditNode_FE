import { type Node, type Edge } from "@xyflow/react";

export interface TopologyAppData {
  id: string;
  appId: string;
  serverId: string;
  portMappingId: string;
  appName: string;
  portNumber: number;
  protocol: string;
  risk?: string;
  icon?: string;
}
export interface TopologyLabelData { id: string; key: string; value: string; colorHex?: string; }
export interface TopologyLabelGroupNodeData extends Record<string, unknown> { label: TopologyLabelData; serverCount: number; width: number; height: number; }
export type TopologyLabelGroupNode = Node<TopologyLabelGroupNodeData, "topologyLabelGroupNode">;

export interface TopologyServerNodeData extends Record<string, unknown> {
  server: {
    serverId?: string;
    hostname: string;
    ipAddress: string;
    osType?: string;
    environment?: string;
    labels?: { key: string; value: string }[];
    status?: string;
  };
  apps: TopologyAppData[];
  isExpanded?: boolean;
  appCount?: number;
  width: number;
  height: number;
  entityId?: string;
  labels?: TopologyLabelData[];
  isDuplicated?: boolean;
}

export type TopologyServerNode = Node<TopologyServerNodeData, "topologyServerNode">;
export type TopologyNode = TopologyServerNode;
