import { type Node, type Edge, type Viewport } from "@xyflow/react";

export interface PaletteApp {
  id: string;
  appName: string;
  ownerId: string;
  portNumber: number;
  protocol: string;
  icon: string;
  techStack: string;
}

export interface AppNodeData extends Record<string, unknown> {
  app: PaletteApp;
}

export interface ServerNodeData extends Record<string, unknown> {
  server: {
    hostname: string;
    ipAddress: string;
  };
  width: number;
  height: number;
}

export type CustomNode = Node<AppNodeData | ServerNodeData>;

export interface DependencyMap {
  calling: string[];
  called: string[];
}

export interface SelectedItem {
  type: "node" | "edge" | "server" | null;
  id: string | null;
}

export interface ViewportModel extends Viewport {}
