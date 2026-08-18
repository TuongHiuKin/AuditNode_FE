import type { Connection, Edge, Node } from "@xyflow/react";
import type { AppNodeData, PaletteApp, ServerNodeData } from "./types";

export interface DependencyApplicationDto {
  id: string;
  appId: string;
  serverId: string;
  name: string;
  portMappingId: string;
  port: number;
  protocol: string;
  riskLevel?: string;
  icon?: string;
}

export interface DependencyServerDto {
  id: string;
  serverId: string;
  hostname: string;
  ipAddress: string;
  osType?: string;
  environment?: string;
  labels: Array<{ key: string; value: string }>;
  applications: DependencyApplicationDto[];
}

export interface DependencyConnectionDto {
  id: string;
  sourceAppId: string;
  targetAppId: string;
  destinationPortMappingId: string;
  destinationServerId: string;
  connectionType: string;
}

export interface DependencyMapResponse {
  servers: DependencyServerDto[];
  connections: DependencyConnectionDto[];
}

export interface TopologyNodeState {
  id: string;
  nodeType: string;
  label: string;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  parentNodeId: string | null;
  referenceId: string | null;
}

export interface TopologyEdgeState {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string;
  targetHandle: string;
  edgeType: string;
  label: string;
  referenceId: string | null;
}

export interface TopologyState {
  nodes: TopologyNodeState[];
  edges: TopologyEdgeState[];
}

export type GraphAppNode = Node<AppNodeData, "appNode">;
export type GraphServerNode = Node<ServerNodeData, "serverNode">;
export type GraphNode = Node<Record<string, unknown>> | GraphAppNode | GraphServerNode;

const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

export function hasDeploymentId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value !== EMPTY_GUID;
}

export function stableGraphUuid(value: string): string {
  const hashes = [2166136261, 2166136261 ^ 0x9e3779b9, 2166136261 ^ 0x85ebca6b, 2166136261 ^ 0xc2b2ae35];
  for (const character of value) {
    for (let index = 0; index < hashes.length; index += 1) {
      hashes[index] ^= character.charCodeAt(0) + index;
      hashes[index] = Math.imul(hashes[index], 16777619) >>> 0;
    }
  }
  const hex = hashes.map((hash) => hash.toString(16).padStart(8, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function appData(node: Node): PaletteApp | undefined {
  if (node.type !== "appNode") return undefined;
  const app = node.data?.app;
  if (!app || typeof app !== "object") return undefined;
  return app as unknown as PaletteApp;
}

export function mapDependencyGraph(data: DependencyMapResponse): { nodes: GraphNode[]; edges: Edge[] } {
  const nodes: GraphNode[] = [];
  (data.servers ?? []).forEach((server, serverIndex) => {
    const serverNodeId = server.serverId || server.id;
    nodes.push({
      id: serverNodeId,
      type: "serverNode",
      position: { x: 100 + (serverIndex % 3) * 450, y: 100 + Math.floor(serverIndex / 3) * 350 },
      style: { width: 300, height: 200 },
      data: {
        server: {
          serverId: server.serverId,
          hostname: server.hostname,
          ipAddress: server.ipAddress,
          osType: server.osType,
          labels: server.labels,
        },
        width: 300,
        height: 200,
      },
      zIndex: -1,
    });

    server.applications.forEach((application, appIndex) => {
      if (!hasDeploymentId(application.portMappingId)) return;
      nodes.push({
        id: application.portMappingId,
        type: "appNode",
        position: { x: 40, y: 60 + appIndex * 60 },
        parentId: serverNodeId,
        extent: "parent",
        data: {
          app: {
            id: application.portMappingId,
            appId: application.appId,
            serverId: application.serverId || server.serverId,
            portMappingId: application.portMappingId,
            appName: application.name,
            portNumber: application.port,
            protocol: application.protocol,
            risk: application.riskLevel,
            icon: application.icon ?? "",
            ownerId: "",
            techStack: "",
            isMapped: true,
          },
        },
      });
    });
  });

  const deploymentNodes = nodes.filter((node): node is GraphAppNode => node.type === "appNode");
  const edges = (data.connections ?? []).flatMap<Edge>((connection) => {
    const source = deploymentNodes
      .filter((node) => node.data.app.appId === connection.sourceAppId)
      .sort((left, right) => left.data.app.portMappingId.localeCompare(right.data.app.portMappingId))[0];
    const target = deploymentNodes.find(
      (node) => node.data.app.portMappingId === connection.destinationPortMappingId,
    );
    if (!source || !target) return [];
    return [{
      id: connection.id,
      source: source.id,
      target: target.id,
      type: "floatingSmooth",
      animated: true,
      label: connection.connectionType,
      data: { protocol: connection.connectionType, dependencyId: connection.id },
    }];
  });

  return { nodes, edges };
}

export function validateConnection(
  connection: Pick<Connection, "source" | "target">,
  nodes: Node[],
  edges: Edge[],
): string | null {
  if (!connection.source || !connection.target) return "Both deployments are required.";
  const source = nodes.find((node) => node.id === connection.source);
  const target = nodes.find((node) => node.id === connection.target);
  const sourceApp = source ? appData(source) : undefined;
  const targetApp = target ? appData(target) : undefined;
  if (!sourceApp || !targetApp || !hasDeploymentId(targetApp.portMappingId)) {
    return "A valid target deployment and port are required.";
  }
  if (connection.source === connection.target || sourceApp.appId === targetApp.appId) {
    return "An application cannot depend on itself.";
  }
  if (edges.some((edge) => edge.source === connection.source && edge.target === connection.target)) {
    return "This dependency is a duplicate.";
  }
  return null;
}

export function buildDependencySyncRequest(nodes: Node[], edges: Edge[]) {
  const dependencies = edges.flatMap((edge) => {
    const source = nodes.find((node) => node.id === edge.source);
    const target = nodes.find((node) => node.id === edge.target);
    const sourceApp = source ? appData(source) : undefined;
    const targetApp = target ? appData(target) : undefined;
    if (!sourceApp || !targetApp || !hasDeploymentId(targetApp.portMappingId)) return [];
    return [{
      sourceAppId: sourceApp.appId,
      destAppId: targetApp.appId,
      destinationPortMappingId: targetApp.portMappingId,
    }];
  });
  return {
    dependencies: dependencies.filter((item, index) =>
      dependencies.findIndex((candidate) =>
        candidate.sourceAppId === item.sourceAppId &&
        candidate.destAppId === item.destAppId &&
        candidate.destinationPortMappingId === item.destinationPortMappingId,
      ) === index,
    ),
  };
}

function dimension(node: Node, key: "width" | "height"): number | null {
  const direct = node[key];
  if (typeof direct === "number") return direct;
  const styled = node.style?.[key];
  return typeof styled === "number" ? styled : null;
}

function canonicalNodeType(type: string | undefined): "application" | "server" | "frame" | "group" {
  if (type === "appNode" || type === "topologyAppNode" || type === "application") return "application";
  if (type === "serverNode" || type === "topologyServerNode" || type === "server") return "server";
  if (type === "boundaryFrame" || type === "frame") return "frame";
  return "group";
}

function uiNodeType(type: string): string {
  if (type === "application") return "appNode";
  if (type === "server") return "serverNode";
  if (type === "frame") return "boundaryFrame";
  if (type === "group") return "groupNode";
  return type;
}

export function toTopologyState(nodes: Node[], edges: Edge[]): TopologyState {
  return {
    nodes: nodes.map((node) => {
      const app = appData(node);
      const server = node.data?.server as { serverId?: string; hostname?: string } | undefined;
      const label = String(node.data?.name ?? node.data?.label ?? app?.appName ?? server?.hostname ?? "");
      const referenceId = app?.portMappingId ?? server?.serverId ?? node.data?.referenceId;
      return {
        id: node.id,
        nodeType: canonicalNodeType(node.type),
        label,
        x: node.position.x,
        y: node.position.y,
        width: dimension(node, "width"),
        height: dimension(node, "height"),
        parentNodeId: node.parentId ?? null,
        referenceId: typeof referenceId === "string" && referenceId.length > 0 ? referenceId : null,
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      sourceHandle: edge.sourceHandle ?? "",
      targetHandle: edge.targetHandle ?? "",
      edgeType: edge.type ?? "default",
      label: typeof edge.label === "string" ? edge.label : "",
      referenceId: typeof edge.data?.dependencyId === "string" ? edge.data.dependencyId : null,
    })),
  };
}

export function restoreTopologyState(
  state: TopologyState,
  liveGraph: { nodes: Node[]; edges: Edge[] },
): { nodes: Node[]; edges: Edge[] } {
  if (state.nodes.length === 0) return liveGraph;

  const liveByIdentity = new Map<string, Node>();
  liveGraph.nodes.forEach((node) => {
    liveByIdentity.set(node.id, node);
    const app = appData(node);
    if (app?.portMappingId) liveByIdentity.set(app.portMappingId, node);
    const server = node.data?.server as { serverId?: string } | undefined;
    if (server?.serverId) liveByIdentity.set(server.serverId, node);
  });

  const nodes = state.nodes.flatMap<Node>((saved) => {
    const live = liveByIdentity.get(saved.referenceId ?? "") ?? liveByIdentity.get(saved.id);
    if (live) {
      return [{
        ...live,
        id: saved.id,
        type: uiNodeType(saved.nodeType),
        position: { x: saved.x, y: saved.y },
        parentId: saved.parentNodeId ?? undefined,
        extent: saved.parentNodeId ? "parent" : live.extent,
        style: {
          ...live.style,
          ...(saved.width === null ? {} : { width: saved.width }),
          ...(saved.height === null ? {} : { height: saved.height }),
        },
      }];
    }
    if (saved.nodeType !== "frame" && saved.nodeType !== "group") return [];
    return [{
      id: saved.id,
      type: uiNodeType(saved.nodeType),
      position: { x: saved.x, y: saved.y },
      parentId: saved.parentNodeId ?? undefined,
      style: {
        ...(saved.width === null ? {} : { width: saved.width }),
        ...(saved.height === null ? {} : { height: saved.height }),
      },
      data: saved.nodeType === "frame"
        ? { name: saved.label, referenceId: saved.referenceId }
        : { label: saved.label, referenceId: saved.referenceId },
      zIndex: -2,
    }];
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = state.edges.flatMap<Edge>((saved) => {
    if (!nodeIds.has(saved.sourceNodeId) || !nodeIds.has(saved.targetNodeId)) return [];
    return [{
      id: saved.id,
      source: saved.sourceNodeId,
      target: saved.targetNodeId,
      sourceHandle: saved.sourceHandle || undefined,
      targetHandle: saved.targetHandle || undefined,
      type: saved.edgeType,
      label: saved.label,
      data: { protocol: saved.label, dependencyId: saved.referenceId },
    }];
  });
  return { nodes, edges: state.edges.length > 0 ? edges : liveGraph.edges };
}
