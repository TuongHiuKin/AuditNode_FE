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

    expect(result.current.nodes.find(n => n.type === "serverNode")).toBeDefined();
    expect(result.current.nodes.find(n => n.type === "appNode")).toBeDefined();
    expect(result.current.edges.length).toBe(1);
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
});
