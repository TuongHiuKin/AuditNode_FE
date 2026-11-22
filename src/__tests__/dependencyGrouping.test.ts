import { describe, expect, it } from "vitest";
import type { GraphConnectionDto, GraphLabelData, GraphServerNodeDto } from "../features/dependency-graph/types";
import { buildDependencyGraph } from "../features/dependency-graph/utils/dependencyGrouping";

const platform: GraphLabelData = {
  id: "label-platform",
  key: "team",
  value: "platform",
  colorHex: "#ff4d7e",
};
const payments: GraphLabelData = {
  id: "label-payments",
  key: "service",
  value: "payments",
};

const servers: GraphServerNodeDto[] = [
  {
    id: "server-1",
    hostname: "api-host",
    ipAddress: "10.0.0.1",
    labels: [platform],
    applications: [
      {
        id: "app-api",
        portMappingId: "port-api",
        name: "API",
        port: 8080,
        protocol: "HTTP",
        labels: [payments],
      },
      {
        id: "app-agent",
        portMappingId: "port-agent",
        name: "Agent",
        port: 9100,
        protocol: "TCP",
        labels: [],
      },
    ],
  },
];

describe("dependency label grouping", () => {
  it("keeps all hosted apps when the server owns the selected label", () => {
    const result = buildDependencyGraph(servers, [], [platform]);
    const group = result.nodes.find(
      (node) => node.type === "dependencyLabelGroupNode",
    );
    const server = result.nodes.find((node) => node.type === "serverNode");
    const apps = result.nodes.filter((node) => node.type === "appNode");

    expect(group?.data.serverCount).toBe(1);
    expect(group?.data.applicationCount).toBe(2);
    expect(server?.parentId).toBe(group?.id);
    expect(apps).toHaveLength(2);
    expect(apps.every((app) => app.parentId === server?.id)).toBe(true);
    expect(group).toMatchObject({
      draggable: true,
      dragHandle: ".dependency-label-drag-handle",
    });
  });

  it("uses the hosting server as context and keeps only matching apps", () => {
    const result = buildDependencyGraph(servers, [], [payments]);
    const apps = result.nodes.filter((node) => node.type === "appNode");

    expect(result.nodes.filter((node) => node.type === "serverNode")).toHaveLength(1);
    expect(apps).toHaveLength(1);
    expect((apps[0].data as { app: { id: string } }).app.id).toBe("app-api");
  });

  it("creates stable visual instances for multiple labels without losing canonical IDs", () => {
    const result = buildDependencyGraph(servers, [], [platform, payments]);
    const serversInFrames = result.nodes.filter(
      (node) => node.type === "serverNode",
    );

    expect(serversInFrames.map((node) => node.id)).toEqual([
      "dependency-server::server-1::label::label-platform",
      "dependency-server::server-1::label::label-payments",
    ]);
    expect(
      serversInFrames.map(
        (node) => (node.data as { entityId: string }).entityId,
      ),
    ).toEqual(["server-1", "server-1"]);
  });

  it("keeps only edges whose applications are visible inside the same frame", () => {
    const connections: GraphConnectionDto[] = [
      { sourceAppId: "app-api", targetAppId: "app-agent" },
    ];

    expect(buildDependencyGraph(servers, connections, [platform]).edges).toHaveLength(1);
    expect(buildDependencyGraph(servers, connections, [payments]).edges).toHaveLength(0);
  });

  it("preserves the ungrouped server and application identities", () => {
    const result = buildDependencyGraph(servers, [], []);

    expect(result.nodes.find((node) => node.type === "serverNode")?.id).toBe(
      "server-1",
    );
    expect(result.nodes.find((node) => node.type === "appNode")?.id).toBe(
      "app-api",
    );
    expect(
      result.nodes.some((node) => node.type === "dependencyLabelGroupNode"),
    ).toBe(false);
  });
});
