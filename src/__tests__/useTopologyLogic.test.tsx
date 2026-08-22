import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTopologyLogic } from "../features/dependency-graph/hooks/useTopologyLogic";
import apiClient from "../shared/api/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import React from "react";
import { setSelectedWorkspaceId } from "../shared/workspace/workspaceStore";

vi.mock("../shared/api/client", () => ({
  default: { get: vi.fn() },
}));

vi.mock("@xyflow/react", async () => {
  const actual = await vi.importActual("@xyflow/react");
  return {
    ...actual,
    useReactFlow: () => ({
      fitView: vi.fn(),
      screenToFlowPosition: vi.fn(({ x, y }) => ({ x, y })),
      setCenter: vi.fn(),
      getNodes: vi.fn(() => []),
    }),
  };
});

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe("useTopologyLogic (Isolated)", () => {
  const workspaceA = "11111111-1111-4111-8111-111111111111";
  const workspaceB = "22222222-2222-4222-8222-222222222222";
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    setSelectedWorkspaceId(workspaceA, { persist: false });
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ReactFlowProvider>{children}</ReactFlowProvider>
    </QueryClientProvider>
  );

  it("calculates symmetric grid positions for servers", async () => {
    const mockData = {
      servers: [
        { id: "s1", serverId: "s1", hostname: "h1", ipAddress: "i1", labels: [], applications: [] },
        { id: "s2", serverId: "s2", hostname: "h2", ipAddress: "i2", labels: [], applications: [] },
      ],
      connections: [],
    };

    vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useTopologyLogic(), { wrapper });

    await waitFor(() => {
      expect(result.current.nodes.length).toBe(2);
    });

    const srv1 = result.current.nodes.find(n => n.id === "s1");
    const srv2 = result.current.nodes.find(n => n.id === "s2");

    expect(srv1?.position.x).toBe(0);
    expect(srv2?.position.x).toBe(280 + 60); // width + gap
  });

  it("opens panel strictly on double click (mocked via logic test)", async () => {
    const mockData = {
      servers: [{ id: "s1", serverId: "s1", hostname: "h1", ipAddress: "i1", labels: [], applications: [] }],
      connections: [],
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useTopologyLogic(), { wrapper });

    await waitFor(() => expect(result.current.nodes.length).toBeGreaterThan(0));

    // Single click (selection change) should not set rightPanelData
    act(() => {
        result.current.onSelectionChange({ nodes: [result.current.nodes[0]] } as any);
    });
    expect(result.current.rightPanelData).toBeNull();

    // Double click should set rightPanelData
    act(() => {
        result.current.onNodeDoubleClick({} as any, result.current.nodes[0]);
    });
    expect(result.current.rightPanelData).not.toBeNull();
  });

  it("highlights nodes based on appSearchQuery", async () => {
    const mockData = {
      servers: [
        { id: "s1", serverId: "s1", hostname: "h1", ipAddress: "i1", labels: [], applications: [{ id: "m1", appId: "a1", serverId: "s1", portMappingId: "m1", name: "Auth Service", port: 8080, protocol: "HTTP" }] },
        { id: "s2", serverId: "s2", hostname: "h2", ipAddress: "i2", labels: [], applications: [{ id: "m2", appId: "a2", serverId: "s2", portMappingId: "m2", name: "Payment Service", port: 9090, protocol: "HTTP" }] },
      ],
      connections: [],
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useTopologyLogic(), { wrapper });

    await waitFor(() => expect(result.current.nodes.length).toBe(2));

    // Search for "Auth" (App match)
    act(() => {
      result.current.setAppSearchQuery("Auth");
    });

    // Wait for useEffect to trigger
    await waitFor(() => {
      const s1 = result.current.nodes.find(n => n.id === "s1");
      const s2 = result.current.nodes.find(n => n.id === "s2");
      expect(s1?.style?.opacity).toBe(1);
      expect(s2?.style?.opacity).toBe(0.3);
    });

    // Search for "h2" (Server hostname match)
    act(() => {
      result.current.setAppSearchQuery("h2");
    });

    await waitFor(() => {
      const s1 = result.current.nodes.find(n => n.id === "s1");
      const s2 = result.current.nodes.find(n => n.id === "s2");
      expect(s1?.style?.opacity).toBe(0.3);
      expect(s2?.style?.opacity).toBe(1);
    });

    // Clear search
    act(() => {
      result.current.setAppSearchQuery("");
    });

    await waitFor(() => {
      expect(result.current.nodes.every(n => n.style?.opacity === 1)).toBe(true);
    });
  });

  it("clears immediately and ignores a late topology response from the previous workspace", async () => {
    let resolveA!: (value: { data: any }) => void;
    let resolveB!: (value: { data: any }) => void;
    const requestA = new Promise<{ data: any }>((resolve) => { resolveA = resolve; });
    const requestB = new Promise<{ data: any }>((resolve) => { resolveB = resolve; });
    let calls = 0;
    vi.mocked(apiClient.get).mockImplementation(() => ++calls === 1 ? requestA : requestB);
    const graph = (serverId: string) => ({
      servers: [{ serverId, hostname: serverId, ipAddress: "10.0.0.1", applications: [] }],
      connections: [],
    });
    const { result } = renderHook(() => useTopologyLogic(), { wrapper });
    await waitFor(() => expect(calls).toBe(1));

    act(() => { setSelectedWorkspaceId(workspaceB, { persist: false }); });
    expect(result.current.nodes).toEqual([]);
    await waitFor(() => expect(calls).toBe(2));
    await act(async () => { resolveB({ data: graph("server-b") }); });
    await waitFor(() => expect(result.current.nodes.some((node) => node.id === "server-b")).toBe(true));
    await act(async () => { resolveA({ data: graph("server-a") }); });

    expect(result.current.nodes.some((node) => node.id === "server-a")).toBe(false);
    expect(result.current.nodes.some((node) => node.id === "server-b")).toBe(true);
    expect(vi.mocked(apiClient.get).mock.calls.every(([, config]) => config?.signal instanceof AbortSignal)).toBe(true);
  });
});
