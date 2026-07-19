import { describe, expect, it } from "vitest";
import {
  buildTopologyNodes,
  countUniqueTopologyServers,
} from "../features/dependency-graph/utils/topologyGrouping";
import { getLayoutedElements } from "../features/dependency-graph/utils/layout";
import type { TopologyLabelData } from "../features/dependency-graph/topology-types";

const platform: TopologyLabelData = {
  id: "label-platform",
  key: "team",
  value: "platform",
  colorHex: "#ff4d7e",
};

const production: TopologyLabelData = {
  id: "label-production",
  key: "environment",
  value: "production",
};

describe("topology label grouping", () => {
  it("places every matching server inside the selected label frame", () => {
    const nodes = buildTopologyNodes(
      [
        { id: "server-1", hostname: "api-01", labels: [platform] },
        { id: "server-2", hostname: "worker-01", labels: [platform] },
      ],
      [platform],
    );

    const group = nodes.find((node) => node.type === "topologyLabelGroupNode");
    const servers = nodes.filter((node) => node.type === "topologyServerNode");

    expect(group?.id).toBe("label-group::label-platform");
    expect(group?.data.serverCount).toBe(2);
    expect(group?.zIndex ?? 0).toBeGreaterThanOrEqual(0);
    expect(Number(group?.style?.zIndex ?? 0)).toBeGreaterThanOrEqual(0);
    expect(servers).toHaveLength(2);
    expect(servers.every((node) => node.parentId === group?.id)).toBe(true);
  });

  it("creates synchronized display instances for a multi-label server without double-counting it", () => {
    const nodes = buildTopologyNodes(
      [
        {
          id: "server-1",
          hostname: "api-01",
          labels: [platform, production],
        },
      ],
      [platform, production],
    );

    const servers = nodes.filter((node) => node.type === "topologyServerNode");

    expect(servers.map((node) => node.id)).toEqual([
      "server-1::label-platform",
      "server-1::label-production",
    ]);
    expect(servers.every((node) => node.data.entityId === "server-1")).toBe(true);
    expect(countUniqueTopologyServers(nodes)).toBe(1);
  });

  it("keeps stable server IDs when grouping is disabled", () => {
    const nodes = buildTopologyNodes(
      [{ id: "server-1", hostname: "api-01", labels: [platform] }],
      [],
    );

    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("server-1");
    expect(nodes[0].parentId).toBeUndefined();
  });

  it("keeps an empty selected frame visible after other filters remove all servers", () => {
    const nodes = buildTopologyNodes([], [platform]);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe("topologyLabelGroupNode");
    expect(nodes[0].data.serverCount).toBe(0);
  });

  it("expands the label frame to contain an expanded server", async () => {
    const nodes = buildTopologyNodes(
      [{ id: "server-1", hostname: "api-01", labels: [platform] }],
      [platform],
    );
    const server = nodes.find((node) => node.type === "topologyServerNode")!;
    server.data = {
      ...server.data,
      isExpanded: true,
      width: 400,
      height: 300,
    };

    const { nodes: layoutedNodes } = await getLayoutedElements(nodes, [], "TB");
    const group = layoutedNodes.find(
      (node) => node.type === "topologyLabelGroupNode",
    )!;
    const layoutedServer = layoutedNodes.find(
      (node) => node.type === "topologyServerNode",
    )!;

    expect(Number(group.style?.width)).toBeGreaterThanOrEqual(400);
    expect(Number(group.style?.height)).toBeGreaterThanOrEqual(300);
    expect(Number.isFinite(layoutedServer.position.x)).toBe(true);
    expect(Number.isFinite(layoutedServer.position.y)).toBe(true);
  });
});
