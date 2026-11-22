import type { Node } from "@xyflow/react";
import type { GraphApplicationNodeDto, GraphServerNodeDto, GraphTopologyLabelDto } from "../types";
import type {
  TopologyAppData,
  TopologyLabelData,
  TopologyLabelGroupNode,
  TopologyServerNode,
  TopologyServerNodeData,
} from "../topology-types";

const COLLAPSED_SERVER_WIDTH = 280;
const COLLAPSED_SERVER_HEIGHT = 80;
const EMPTY_GROUP_WIDTH = 360;
const EMPTY_GROUP_HEIGHT = 160;

export function normalizeTopologyLabel(
  label: GraphTopologyLabelDto,
): TopologyLabelData | null {
  if (!label.id || !label.key || !label.value) {
    return null;
  }

  return {
    id: label.id,
    key: label.key,
    value: label.value,
    colorHex: label.colorHex,
  };
}

function normalizeApps(
  serverId: string,
  applications: GraphApplicationNodeDto[] = [],
): TopologyAppData[] {
  return applications.map((app, index) => ({
    id: app.id ?? app.portMappingId ?? `${serverId}-app-${index}`,
    appId: app.appId ?? app.id ?? `${serverId}-app-${index}`,
    serverId: app.serverId ?? serverId,
    portMappingId: app.portMappingId ?? app.id ?? `${serverId}-app-${index}`,
    appName: app.name ?? "Unnamed application",
    portNumber: Number(app.port ?? 0),
    protocol: app.protocol ?? "",
  }));
}

function createServerData(
  server: GraphServerNodeDto,
  entityId: string,
  isDuplicated: boolean,
): TopologyServerNodeData {
  const apps = normalizeApps(entityId, server.applications);
  const labels = (server.labels ?? [])
    .map(normalizeTopologyLabel)
    .filter((label): label is TopologyLabelData => label !== null);

  return {
    entityId,
    server: {
      hostname: server.hostname ?? "Unnamed server",
      ipAddress: server.ipAddress ?? "N/A",
      osType: server.osType,
      environment: server.environment,
      status: server.status,
    },
    apps,
    labels,
    appCount: apps.length,
    isExpanded: false,
    width: COLLAPSED_SERVER_WIDTH,
    height: COLLAPSED_SERVER_HEIGHT,
    isDuplicated,
  };
}

export function buildTopologyNodes(
  servers: GraphServerNodeDto[],
  selectedLabels: TopologyLabelData[],
): Node[] {
  const validServers = servers.filter(
    (server): server is GraphServerNodeDto & { id: string } => Boolean(server.id),
  );

  if (selectedLabels.length === 0) {
    return validServers.map<TopologyServerNode>((server) => ({
      id: server.id,
      type: "topologyServerNode",
      position: { x: 0, y: 0 },
      data: createServerData(server, server.id, false),
    }));
  }

  const selectedLabelIds = new Set(selectedLabels.map((label) => label.id));
  const groupNodes = selectedLabels.map<TopologyLabelGroupNode>((label) => ({
    id: `label-group::${label.id}`,
    type: "topologyLabelGroupNode",
    position: { x: 0, y: 0 },
    data: {
      label,
      serverCount: validServers.filter((server) =>
        server.labels?.some((serverLabel) => serverLabel.id === label.id),
      ).length,
      width: EMPTY_GROUP_WIDTH,
      height: EMPTY_GROUP_HEIGHT,
    },
    style: {
      width: EMPTY_GROUP_WIDTH,
      height: EMPTY_GROUP_HEIGHT,
    },
    zIndex: 0,
    selectable: false,
    draggable: false,
  }));

  const serverNodes = validServers.flatMap<TopologyServerNode>((server) => {
    const matchingLabelIds = (server.labels ?? [])
      .map((label) => label.id)
      .filter(
        (labelId): labelId is string =>
          typeof labelId === "string" && selectedLabelIds.has(labelId),
      );

    return matchingLabelIds.map((labelId) => ({
      id: `${server.id}::${labelId}`,
      type: "topologyServerNode",
      parentId: `label-group::${labelId}`,
      extent: "parent",
      position: { x: 0, y: 0 },
      data: createServerData(server, server.id, matchingLabelIds.length > 1),
    }));
  });

  return [...groupNodes, ...serverNodes];
}

export function countUniqueTopologyServers(nodes: Node[]): number {
  return new Set(
    nodes
      .filter((node) => node.type === "topologyServerNode")
      .map((node) => (node.data as TopologyServerNodeData | undefined)?.entityId ?? node.id),
  ).size;
}
