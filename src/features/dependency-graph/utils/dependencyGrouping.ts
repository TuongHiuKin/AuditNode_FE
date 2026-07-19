import {
  MarkerType,
  type Edge,
  type Node,
} from "@xyflow/react";
import type { Schemas } from "../../../shared/api/client";
import type {
  AppNodeData,
  DependencyLabelGroupNodeData,
  GraphLabelData,
  ServerNodeData,
} from "../types";

const SERVER_WIDTH = 300;
const SERVER_MIN_HEIGHT = 120;
const APP_HEIGHT = 44;
const APP_VERTICAL_GAP = 12;
const SERVER_HEADER_SPACE = 58;
const GROUP_PADDING = 40;
const GROUP_HEADER_SPACE = 58;
const SERVER_GAP_X = 54;
const SERVER_GAP_Y = 56;
const GROUP_GAP = 100;
const GROUP_MIN_WIDTH = 380;
const GROUP_MIN_HEIGHT = 180;

interface ServerEntry {
  server: Schemas["ServerNodeDto"] & { id: string };
  applications: Schemas["ApplicationNodeDto"][];
}

export interface DependencyGraphBuildResult {
  nodes: Node[];
  edges: Edge[];
}

function normalizeLabel(
  label: Schemas["TopologyLabelDto"],
): GraphLabelData | null {
  if (!label.id || !label.key || !label.value) return null;

  return {
    id: label.id,
    key: label.key,
    value: label.value,
    colorHex: label.colorHex,
  };
}

function hasLabel(
  labels: Schemas["TopologyLabelDto"][] | undefined,
  labelId: string,
): boolean {
  return labels?.some((label) => label.id === labelId) ?? false;
}

function getServerHeight(applicationCount: number): number {
  if (applicationCount === 0) return SERVER_MIN_HEIGHT;

  return Math.max(
    SERVER_MIN_HEIGHT,
    SERVER_HEADER_SPACE +
      applicationCount * APP_HEIGHT +
      Math.max(0, applicationCount - 1) * APP_VERTICAL_GAP +
      24,
  );
}

function createServerNode(
  entry: ServerEntry,
  id: string,
  position: { x: number; y: number },
  parentId?: string,
): Node<ServerNodeData, "serverNode"> {
  const height = getServerHeight(entry.applications.length);
  const labels = (entry.server.labels ?? [])
    .map(normalizeLabel)
    .filter((label): label is GraphLabelData => label !== null);

  return {
    id,
    type: "serverNode",
    position,
    parentId,
    extent: parentId ? "parent" : undefined,
    data: {
      entityId: entry.server.id,
      server: {
        hostname: entry.server.hostname ?? "Unnamed server",
        ipAddress: entry.server.ipAddress ?? "N/A",
        osType: entry.server.osType,
      },
      labels,
      width: SERVER_WIDTH,
      height,
      isDerivedLabelInstance: Boolean(parentId),
    },
    style: { width: SERVER_WIDTH, height },
    zIndex: parentId ? 1 : -1,
  };
}

function createAppNode(
  app: Schemas["ApplicationNodeDto"],
  id: string,
  parentId: string,
  index: number,
  isDerivedLabelInstance: boolean,
): Node<AppNodeData, "appNode"> {
  const labels = (app.labels ?? [])
    .map(normalizeLabel)
    .filter((label): label is GraphLabelData => label !== null);

  return {
    id,
    type: "appNode",
    position: {
      x: 30,
      y: SERVER_HEADER_SPACE + index * (APP_HEIGHT + APP_VERTICAL_GAP),
    },
    parentId,
    extent: "parent",
    data: {
      app: {
        id: app.id ?? app.portMappingId ?? id,
        appName: app.name ?? "Unnamed application",
        portNumber: Number(app.port ?? 0),
        protocol: app.protocol ?? "",
        portMappingId: app.portMappingId,
        labels,
        isDerivedLabelInstance,
      },
    },
    zIndex: 2,
  };
}

function createEdges(
  connections: Schemas["ConnectionDto"][],
  visualAppIds: Map<string, string[]>,
  scopeId: string,
): Edge[] {
  return connections.flatMap((connection, index) => {
    if (!connection.sourceAppId || !connection.targetAppId) return [];

    const source = visualAppIds.get(connection.sourceAppId)?.[0];
    const target = visualAppIds.get(connection.targetAppId)?.[0];
    if (!source || !target) return [];

    return [{
      id: `dependency-edge::${scopeId}::${index}::${source}::${target}`,
      source,
      target,
      type: "floatingSmooth",
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "var(--color-primary)",
      },
      style: {
        stroke: "var(--color-primary)",
        strokeWidth: 2,
      },
      data: { protocol: "TCP" },
    }];
  });
}

function validServers(
  servers: Schemas["ServerNodeDto"][],
): Array<Schemas["ServerNodeDto"] & { id: string }> {
  return servers.filter(
    (server): server is Schemas["ServerNodeDto"] & { id: string } =>
      Boolean(server.id),
  );
}

function buildUngroupedGraph(
  servers: Schemas["ServerNodeDto"][],
  connections: Schemas["ConnectionDto"][],
): DependencyGraphBuildResult {
  const nodes: Node[] = [];
  const visualAppIds = new Map<string, string[]>();

  validServers(servers).forEach((server, serverIndex) => {
    const applications = server.applications ?? [];
    const serverId = server.id;
    const serverNode = createServerNode(
      { server, applications },
      serverId,
      {
        x: 100 + (serverIndex % 3) * 450,
        y: 100 + Math.floor(serverIndex / 3) * 350,
      },
    );
    nodes.push(serverNode);

    applications.forEach((app, appIndex) => {
      const canonicalAppId = app.id ?? app.portMappingId;
      const visualAppId =
        canonicalAppId && !visualAppIds.has(canonicalAppId)
          ? canonicalAppId
          : `app-${canonicalAppId ?? appIndex}-srv-${serverId}`;

      nodes.push(
        createAppNode(app, visualAppId, serverId, appIndex, false),
      );
      if (canonicalAppId) {
        visualAppIds.set(canonicalAppId, [
          ...(visualAppIds.get(canonicalAppId) ?? []),
          visualAppId,
        ]);
      }
    });
  });

  return {
    nodes,
    edges: createEdges(connections, visualAppIds, "ungrouped"),
  };
}

export function buildDependencyGraph(
  servers: Schemas["ServerNodeDto"][],
  connections: Schemas["ConnectionDto"][],
  selectedLabels: GraphLabelData[],
): DependencyGraphBuildResult {
  if (selectedLabels.length === 0) {
    return buildUngroupedGraph(servers, connections);
  }

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let groupX = 80;

  for (const label of selectedLabels) {
    const entries = validServers(servers).flatMap<ServerEntry>((server) => {
      const applications = server.applications ?? [];
      const serverMatches = hasLabel(server.labels, label.id);
      const visibleApplications = serverMatches
        ? applications
        : applications.filter((app) => hasLabel(app.labels, label.id));

      if (!serverMatches && visibleApplications.length === 0) return [];
      return [{ server, applications: visibleApplications }];
    });

    const columnCount = Math.min(2, Math.max(1, entries.length));
    const columnHeights = Array.from(
      { length: columnCount },
      () => GROUP_HEADER_SPACE,
    );
    const groupWidth = Math.max(
      GROUP_MIN_WIDTH,
      GROUP_PADDING * 2 +
        columnCount * SERVER_WIDTH +
        Math.max(0, columnCount - 1) * SERVER_GAP_X,
    );
    const groupId = `dependency-label-group::${label.id}`;
    const visualAppIds = new Map<string, string[]>();

    entries.forEach((entry, serverIndex) => {
      const column = serverIndex % columnCount;
      const serverHeight = getServerHeight(entry.applications.length);
      const serverVisualId =
        `dependency-server::${entry.server.id}::label::${label.id}`;
      const serverX =
        GROUP_PADDING + column * (SERVER_WIDTH + SERVER_GAP_X);
      const serverY = columnHeights[column] ?? GROUP_HEADER_SPACE;

      nodes.push(
        createServerNode(
          entry,
          serverVisualId,
          { x: serverX, y: serverY },
          groupId,
        ),
      );
      columnHeights[column] =
        serverY + serverHeight + SERVER_GAP_Y;

      entry.applications.forEach((app, appIndex) => {
        const canonicalAppId = app.id ?? app.portMappingId;
        const appVisualId =
          `dependency-app::${app.portMappingId ?? app.id ?? appIndex}` +
          `::server::${entry.server.id}::label::${label.id}`;

        nodes.push(
          createAppNode(
            app,
            appVisualId,
            serverVisualId,
            appIndex,
            true,
          ),
        );
        if (canonicalAppId) {
          visualAppIds.set(canonicalAppId, [
            ...(visualAppIds.get(canonicalAppId) ?? []),
            appVisualId,
          ]);
        }
      });
    });

    const groupHeight = Math.max(
      GROUP_MIN_HEIGHT,
      ...columnHeights.map((height) => height + GROUP_PADDING),
    );
    const groupNode: Node<
      DependencyLabelGroupNodeData,
      "dependencyLabelGroupNode"
    > = {
      id: groupId,
      type: "dependencyLabelGroupNode",
      position: { x: groupX, y: 80 },
      data: {
        label,
        serverCount: entries.length,
        applicationCount: entries.reduce(
          (total, entry) => total + entry.applications.length,
          0,
        ),
        width: groupWidth,
        height: groupHeight,
      },
      style: { width: groupWidth, height: groupHeight },
      selectable: false,
      draggable: true,
      dragHandle: ".dependency-label-drag-handle",
      zIndex: -10,
    };
    nodes.unshift(groupNode);
    edges.push(...createEdges(connections, visualAppIds, label.id));
    groupX += groupWidth + GROUP_GAP;
  }

  return { nodes, edges };
}
