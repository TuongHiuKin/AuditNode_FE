import { type Node, type Edge, type Viewport } from "@xyflow/react";

export interface PaletteApp {
  id: string;
  appName: string;
  ownerId: string;
  portNumber: number;
  protocol: string;
  icon: string;
  techStack: string;
  risk?: string;
  isMapped?: boolean;
  portMappingId?: string;
}

export interface AppNodeData extends Record<string, unknown> {
  app: PaletteApp;
}

export interface ServerNodeData extends Record<string, unknown> {
  server: {
    hostname: string;
    ipAddress: string;
    osType?: string;
    labels?: { key: string; value: string }[];
  };
  width: number;
  height: number;
}

export interface ZoneNodeData extends Record<string, unknown> {
  label: string;
  subtitle?: string;
  variant?: "blue" | "amber" | "emerald" | "violet" | "rose";
  width?: number;
  height?: number;
}

export type CustomNode = Node<AppNodeData | ServerNodeData | ZoneNodeData>;
export type ServerNode = Node<ServerNodeData, "serverNode">;
export type AppNode = Node<AppNodeData, "appNode">;
export type ZoneNodeType = Node<ZoneNodeData, "zoneNode">;

export interface DependencyMap {
  calling: string[];
  called: string[];
}

export interface SelectedItem {
  type: "node" | "edge" | "server" | null;
  id: string | null;
}

export interface ViewportModel extends Viewport {}
