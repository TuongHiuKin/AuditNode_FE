import { type Node, type Edge } from "@xyflow/react";
import { PaletteApp } from "./types";

export interface TopologyServerNodeData extends Record<string, unknown> {
  server: {
    hostname: string;
    ipAddress: string;
    osType?: string;
    environment?: string;
  };
  isExpanded?: boolean;
  appCount?: number;
  width: number;
  height: number;
}

export type TopologyServerNode = Node<TopologyServerNodeData, "topologyServerNode">;
export type TopologyAppNode = Node<{ app: PaletteApp }, "topologyAppNode">;
export type TopologyNode = TopologyServerNode | TopologyAppNode;
