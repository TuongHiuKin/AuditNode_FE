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
}

export interface AppNodeData extends Record<string, unknown> {
  app: PaletteApp;
}

export interface ServerNodeData extends Record<string, unknown> {
  server: {
    hostname: string;
    ipAddress: string;
    osType?: string;
  };
  width: number;
  height: number;
}

export type CustomNode = Node<AppNodeData | ServerNodeData>;
export type ServerNode = Node<ServerNodeData, "serverNode">;
export type AppNode = Node<AppNodeData, "appNode">;

export interface DependencyMap {
  calling: string[];
  called: string[];
}

export interface SelectedItem {
  type: "node" | "edge" | "server" | null;
  id: string | null;
}

export interface ViewportModel extends Viewport {}
