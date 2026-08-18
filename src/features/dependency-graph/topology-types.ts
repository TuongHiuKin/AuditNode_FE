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

export interface TopologyServerNodeData extends Record<string, unknown> {
  server: {
    serverId?: string;
    hostname: string;
    ipAddress: string;
    osType?: string;
    environment?: string;
    labels?: { key: string; value: string }[];
  };
  apps: TopologyAppData[];
  isExpanded?: boolean;
  appCount?: number;
  width: number;
  height: number;
}

export type TopologyServerNode = Node<TopologyServerNodeData, "topologyServerNode">;
export type TopologyNode = TopologyServerNode;
