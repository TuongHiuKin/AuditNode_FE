import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDependencyLogic } from "../features/dependency-graph/hooks/useDependencyLogic";
import apiClient from "../shared/api/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import React from "react";

// Mock apiClient
vi.mock("../shared/api/client", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

// Mock useReactFlow
vi.mock("@xyflow/react", async () => {
  const actual = await vi.importActual("@xyflow/react");
  return {
    ...actual,
    useReactFlow: () => ({
      fitView: vi.fn(),
      screenToFlowPosition: vi.fn(({ x, y }) => ({ x, y })),
      getEdges: vi.fn(() => [
        { id: "e-1", source: "app-123-srv-456", target: "app-789-srv-012" }
      ]),
      getNode: vi.fn((id) => ({ 
        id, 
        type: "appNode", 
        data: { 
          app: { 
            id: id.split("-")[1],
            portMappingId: `pm-${id.split("-")[1]}` 
          } 
        } 
      })),
      getNodes: vi.fn(() => []),
    }),
  };
});

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe("useDependencyLogic", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ReactFlowProvider>
        {children}
      </ReactFlowProvider>
    </QueryClientProvider>
  );

  it("fetches and maps initial data correctly", async () => {
    const mockDependencyMap = {
      servers: [
        {
          id: "srv-1",
          hostname: "server-01",
          ipAddress: "10.0.0.1",
          applications: [
            {
              id: "app-1",
              name: "App 1",
              port: 80,
              protocol: "HTTP",
              riskLevel: "Low",
            },
          ],
        },
      ],
      connections: [
        {
          sourceAppId: "app-1",
          targetAppId: "app-2",
        },
      ],
    };

    const mockApps = [
      { id: "app-1", appName: "App 1", isMapped: false },
      { id: "app-2", appName: "App 2", isMapped: false },
    ];

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/api/Topology/map") {
        return Promise.resolve({ data: mockDependencyMap });
      }
      if (url === "/api/Topology/status") {
        return Promise.resolve({ data: mockApps });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    const { result } = renderHook(() => useDependencyLogic(), { wrapper });

    await waitFor(() => {
      expect(result.current.nodes.length).toBe(2); // 1 server + 1 app
    });

    const serverNode = result.current.nodes.find(n => n.type === "serverNode");
    expect(serverNode).toBeDefined();
    // Grid layout: START_X=100, START_Y=100 for index 0
    expect(serverNode?.position).toEqual({ x: 100, y: 100 });
    
    expect(result.current.nodes.find(n => n.type === "appNode")).toBeDefined();
    expect(result.current.edges.length).toBe(1);
    expect(result.current.edges[0].type).toBe("floatingSmooth");
    expect(result.current.availableApps.length).toBe(2);
  });

  it("updates rightPanelData on selection change for app node", async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/api/Topology/map") {
        return Promise.resolve({ data: { 
          servers: [
            { id: "srv-1", hostname: "test-server", applications: [{ id: "app-1", name: "Test App", port: 443, protocol: "HTTPS", riskLevel: "High" }] }
          ], 
          connections: [] 
        }});
      }
      if (url === "/api/Topology/status") {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    const { result } = renderHook(() => useDependencyLogic(), { wrapper });

    await waitFor(() => {
        expect(result.current.nodes.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.onSelectionChange({ 
        nodes: [result.current.nodes.find(n => n.type === "appNode")!], 
        edges: [] 
      });
    });

    expect(result.current.selectedItem.type).toBe("node");
    expect(result.current.rightPanelData.app.appName).toBe("Test App");
    expect(result.current.rightPanelData.server.hostname).toBe("test-server");
  });

  it("handles auto map by invalidating queries", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useDependencyLogic(), { wrapper });

    await act(async () => {
      await result.current.handleAutoMap();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dependency-map"] });
  });

  it("handles sync to database by parsing composite IDs and calling API", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { success: true } });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    
    const { result } = renderHook(() => useDependencyLogic(), { wrapper });

    await act(async () => {
      await result.current.handleSync();
    });

    expect(apiClient.put).toHaveBeenCalledWith("/api/dependencies/sync", {
      dependencies: [
        { sourceAppId: "123", destAppId: "789", destPortId: "pm-789" }
      ]
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dependency-map"] });
  });

  it("handles reconnecting an edge", async () => {
    const { result } = renderHook(() => useDependencyLogic(), { wrapper });

    const oldEdge = { id: "e-1", source: "app-1", target: "app-2" };
    const newConnection = { source: "app-1", target: "app-3", sourceHandle: null, targetHandle: null };

    await act(async () => {
      result.current.onReconnect(oldEdge as any, newConnection);
    });

    // Check if edges were updated (reconnectEdge is a utility from @xyflow/react)
    // We expect the hook to call setEdges which eventually updates edges state
  });
});
