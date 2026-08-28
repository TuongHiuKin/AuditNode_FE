import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDependencyLogic } from "../features/dependency-graph/hooks/useDependencyLogic";
import apiClient from "../shared/api/client";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const serverId = "22222222-2222-4222-8222-222222222222";
const mappingId = "33333333-3333-4333-8333-333333333333";
const targetMappingId = "55555555-5555-4555-8555-555555555555";
const edgeId = "66666666-6666-4666-8666-666666666666";
const frameId = "88888888-8888-4888-8888-888888888888";

vi.mock("../shared/workspace/WorkspaceContext", () => ({
  useWorkspace: () => ({
    selectedWorkspaceId: workspaceId,
    selectedWorkspace: {
      id: workspaceId,
      name: "Shared",
      effectiveRole: "auditor",
      capabilities: { canEditGraph: true },
    },
  }),
}));

vi.mock("../shared/api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("@xyflow/react", async () => {
  const actual = await vi.importActual<typeof import("@xyflow/react")>("@xyflow/react");
  return {
    ...actual,
    useReactFlow: () => ({
      fitView: vi.fn(),
      screenToFlowPosition: vi.fn(({ x, y }) => ({ x, y })),
      getEdges: vi.fn(() => []),
      getNodes: vi.fn(() => []),
      getNode: vi.fn(),
    }),
  };
});

describe("useDependencyLogic Auditor commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/api/v1/topology/map") return Promise.resolve({ data: {
        servers: [{
          id: serverId,
          serverId,
          hostname: "server",
          ipAddress: "10.0.0.1",
          labels: [],
          applications: [{
            id: mappingId,
            appId: "44444444-4444-4444-8444-444444444444",
            serverId,
            portMappingId: mappingId,
            name: "Payments",
            port: 443,
            protocol: "HTTPS",
          }, {
            id: targetMappingId,
            appId: "77777777-7777-4777-8777-777777777777",
            serverId,
            portMappingId: targetMappingId,
            name: "Ledger",
            port: 8443,
            protocol: "HTTPS",
          }],
        }],
        connections: [],
      } });
      if (url === "/api/v1/topology/state") return Promise.resolve({ data: {
        version: 7,
        nodes: [{
          id: frameId,
          nodeType: "frame",
          label: "Granted frame",
          x: 0,
          y: 0,
          width: 600,
          height: 400,
          parentNodeId: null,
          referenceId: null,
        }, {
          id: mappingId,
          nodeType: "application",
          label: "Payments",
          x: 10,
          y: 20,
          width: null,
          height: null,
          parentNodeId: serverId,
          referenceId: mappingId,
        }, {
          id: targetMappingId,
          nodeType: "application",
          label: "Ledger",
          x: 120,
          y: 20,
          width: null,
          height: null,
          parentNodeId: serverId,
          referenceId: targetMappingId,
        }],
        edges: [{
          id: edgeId,
          sourceNodeId: mappingId,
          targetNodeId: targetMappingId,
          sourceHandle: "",
          targetHandle: "",
          edgeType: "floatingSmooth",
          label: "HTTPS",
        }],
      } });
      return Promise.resolve({ data: [] });
    });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { version: 8 } });
  });

  it("posts scoped commands and never calls replace-all or dependency sync", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <ReactFlowProvider>{children}</ReactFlowProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useDependencyLogic(), { wrapper });
    await waitFor(() => expect(result.current.nodes.some((node) => node.id === mappingId)).toBe(true));

    act(() => result.current.onNodesChange([{
      type: "position",
      id: mappingId,
      position: { x: 40, y: 50 },
      dragging: false,
    }]));
    await act(async () => result.current.handleSaveNetworkState());
    await act(async () => result.current.handleSync());

    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/topology/commands", {
      version: 7,
      operations: [expect.objectContaining({
        type: "moveNode",
        nodeId: mappingId,
        parentId: serverId,
        x: 40,
        y: 50,
      })],
    });
    expect(apiClient.put).not.toHaveBeenCalledWith("/api/v1/topology/state", expect.anything());
    expect(apiClient.put).not.toHaveBeenCalledWith("/api/v1/dependencies/sync", expect.anything());
  });

  it("records custom edge deletion as a scoped delete command", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <ReactFlowProvider>{children}</ReactFlowProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useDependencyLogic(), { wrapper });
    await waitFor(() => expect(result.current.edges.some((edge) => edge.id === edgeId)).toBe(true));

    act(() => result.current.onEdgesChange([{ type: "remove", id: edgeId }]));
    await act(async () => result.current.handleSaveNetworkState());

    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/topology/commands", {
      version: 7,
      operations: [{ type: "deleteEdge", edgeId }],
    });
  });

  it("does not turn XYFlow node measurement into an Auditor mutation", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <ReactFlowProvider>{children}</ReactFlowProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useDependencyLogic(), { wrapper });
    await waitFor(() => expect(result.current.nodes.some((node) => node.id === frameId)).toBe(true));

    act(() => result.current.onNodesChange([{
      type: "dimensions",
      id: frameId,
      dimensions: { width: 600, height: 400 },
      setAttributes: true,
    }]));
    await act(async () => result.current.handleSaveNetworkState());

    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
