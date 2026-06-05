import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTopologyLogic } from "../features/dependency-graph/hooks/useTopologyLogic";
import apiClient from "../shared/api/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import React from "react";

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
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
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
        { id: "s1", hostname: "h1", ipAddress: "i1", applications: [] },
        { id: "s2", hostname: "h2", ipAddress: "i2", applications: [] },
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
      servers: [{ id: "s1", hostname: "h1", ipAddress: "i1", applications: [] }],
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
        { id: "s1", hostname: "h1", ipAddress: "i1", applications: [{ id: "a1", name: "Auth Service", port: 8080 }] },
        { id: "s2", hostname: "h2", ipAddress: "i2", applications: [{ id: "a2", name: "Payment Service", port: 9090 }] },
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
});
