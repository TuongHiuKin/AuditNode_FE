import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import {
  buildDependencySyncRequest,
  mapDependencyGraph,
  restoreTopologyState,
  toTopologyState,
  validateConnection,
} from "../features/dependency-graph/graphContract";

const map = {
  servers: [
    {
      id: "server-node-1",
      serverId: "server-1",
      hostname: "server-one",
      ipAddress: "10.0.0.1",
      labels: [{ key: "tier", value: "api" }],
      applications: [
        { id: "mapping-1", appId: "app-1", serverId: "server-1", portMappingId: "mapping-1", name: "Shared App", port: 8080, protocol: "HTTP" },
      ],
    },
    {
      id: "server-node-2",
      serverId: "server-2",
      hostname: "server-two",
      ipAddress: "10.0.0.2",
      labels: [{ key: "tier", value: "worker" }],
      applications: [
        { id: "mapping-2", appId: "app-1", serverId: "server-2", portMappingId: "mapping-2", name: "Shared App", port: 9090, protocol: "TCP" },
        { id: "mapping-3", appId: "app-2", serverId: "server-2", portMappingId: "mapping-3", name: "Target App", port: 443, protocol: "HTTPS" },
      ],
    },
  ],
  connections: [
    { id: "dependency-1", sourceAppId: "app-1", targetAppId: "app-2", destinationPortMappingId: "mapping-3", destinationServerId: "server-2", connectionType: "HTTP" },
  ],
};

describe("Phase 7 graph contract", () => {
  it("uses deployment identity so one app on two servers creates two unique nodes", () => {
    const graph = mapDependencyGraph(map);
    const appNodes = graph.nodes.filter((node) => node.type === "appNode");
    expect(appNodes.map((node) => node.id)).toEqual(["mapping-1", "mapping-2", "mapping-3"]);
    expect(appNodes[0].data.app).toEqual(expect.objectContaining({
      appId: "app-1",
      serverId: "server-1",
      portMappingId: "mapping-1",
    }));
    expect(graph.edges[0]).toEqual(expect.objectContaining({
      id: "dependency-1",
      target: "mapping-3",
    }));
  });

  it("builds sync DTOs from typed node data without parsing node IDs", () => {
    const graph = mapDependencyGraph(map);
    expect(buildDependencySyncRequest(graph.nodes, graph.edges)).toEqual({
      dependencies: [{
        sourceAppId: "app-1",
        destAppId: "app-2",
        destinationPortMappingId: "mapping-3",
      }],
    });
  });

  it("rejects self, duplicate and missing deployment connections", () => {
    const graph = mapDependencyGraph(map);
    expect(validateConnection({ source: "mapping-1", target: "mapping-2" }, graph.nodes, [])).toMatch(/itself/i);
    expect(validateConnection({ source: "mapping-1", target: "mapping-3" }, graph.nodes, graph.edges)).toMatch(/duplicate/i);
    const missingPort = graph.nodes.map((node) => node.id === "mapping-3"
      ? { ...node, data: { app: { ...(node.data.app as object), portMappingId: "" } } }
      : node) as Node[];
    expect(validateConnection({ source: "mapping-1", target: "mapping-3" }, missingPort, [])).toMatch(/deployment/i);
  });

  it("serializes complete canonical topology state without losing frames or handles", () => {
    const nodes: Node[] = [
      { id: "frame-1", type: "boundaryFrame", position: { x: 10, y: 20 }, width: 500, height: 300, data: { name: "Payments" } },
      { id: "mapping-3", type: "appNode", parentId: "frame-1", position: { x: 30, y: 40 }, data: { app: { appId: "app-2", serverId: "server-2", portMappingId: "mapping-3", appName: "Target", portNumber: 443, protocol: "HTTPS", icon: "", techStack: "", ownerId: "" } } },
    ];
    const edges: Edge[] = [{ id: "edge-1", source: "mapping-3", target: "mapping-3", sourceHandle: "out", targetHandle: "in", type: "floatingSmooth", label: "HTTPS" }];
    const state = toTopologyState(nodes, edges);
    expect(state.nodes[0]).toEqual(expect.objectContaining({ nodeType: "frame", label: "Payments", width: 500, height: 300 }));
    expect(state.nodes[1]).toEqual(expect.objectContaining({ parentNodeId: "frame-1", referenceId: "mapping-3" }));
    expect(state.edges[0]).toEqual(expect.objectContaining({ sourceHandle: "out", targetHandle: "in", edgeType: "floatingSmooth", label: "HTTPS" }));
  });

  it("restores saved layout by deployment reference and keeps frames", () => {
    const live = mapDependencyGraph(map);
    const restored = restoreTopologyState({
      nodes: [
        { id: "frame-1", nodeType: "frame", label: "Payments", x: 5, y: 6, width: 500, height: 300, parentNodeId: null, referenceId: null },
        { id: "mapping-3", nodeType: "application", label: "Target", x: 40, y: 50, width: null, height: null, parentNodeId: "frame-1", referenceId: "mapping-3" },
      ],
      edges: [],
    }, live);
    expect(restored.nodes.find((node) => node.id === "frame-1")?.data.name).toBe("Payments");
    expect(restored.nodes.find((node) => node.id === "mapping-3")).toEqual(expect.objectContaining({
      position: { x: 40, y: 50 },
      parentId: "frame-1",
    }));
  });
});
