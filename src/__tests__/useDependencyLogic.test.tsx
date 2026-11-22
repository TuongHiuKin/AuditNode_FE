import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDependencyLogic } from "../features/dependency-graph/hooks/useDependencyLogic";
import apiClient from "../shared/api/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import React from "react";
import { toTopologyState } from "../features/dependency-graph/graphContract";
import { CatalogAccessProvider, useCatalogAccess } from "../shared/catalog/CatalogAccessContext";
import { invalidateSharedCatalog } from "../shared/catalog/catalogCache";

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
        { id: "e-1", source: "mapping-123", target: "mapping-789" }
      ]),
      getNode: vi.fn(),
      getNodes: vi.fn(() => [
        { id: "mapping-123", type: "appNode", position: { x: 0, y: 0 }, data: { app: { id: "mapping-123", appId: "app-123", serverId: "server-1", portMappingId: "mapping-123" } } },
        { id: "mapping-789", type: "appNode", position: { x: 0, y: 0 }, data: { app: { id: "mapping-789", appId: "app-789", serverId: "server-2", portMappingId: "mapping-789" } } },
      ]),
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
  const ownerB = "22222222-2222-4222-8222-222222222222";
  let queryClient: QueryClient;
  let setCatalogOwner: (ownerUserId: string) => void = () => undefined;

  function CaptureCatalogControls() {
    const { setFilters } = useCatalogAccess();
    setCatalogOwner = (ownerUserId) => setFilters({ ownerUserId });
    return null;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <CatalogAccessProvider>
        <CaptureCatalogControls />
        <ReactFlowProvider>
          {children}
        </ReactFlowProvider>
      </CatalogAccessProvider>
    </QueryClientProvider>
  );

  const sharedWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <CatalogAccessProvider principalId="shared-viewer" initialView="shared">
        <ReactFlowProvider>{children}</ReactFlowProvider>
      </CatalogAccessProvider>
    </QueryClientProvider>
  );

  it("removes Shared graph cache and rendered nodes when access is invalidated", async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/api/v1/topology/map") {
        return Promise.resolve({ data: {
          servers: [{ id: "shared-server", serverId: "shared-server", hostname: "shared", ipAddress: "10.0.0.8", applications: [] }],
          connections: [],
        } });
      }
      if (url === "/api/v1/applications" || url === "/api/v1/servers") return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`Unknown URL: ${url}`));
    });
    const { result } = renderHook(() => useDependencyLogic(), { wrapper: sharedWrapper });
    await waitFor(() => expect(result.current.nodes.length).toBeGreaterThan(0));

    act(() => invalidateSharedCatalog());

    await waitFor(() => expect(result.current.nodes).toHaveLength(0));
    expect(queryClient.getQueriesData({ queryKey: ["catalog-graph"] })).toHaveLength(0);
  });

  it("fetches and maps initial data correctly", async () => {
    const mockDependencyMap = {
      servers: [
        {
          id: "srv-1",
          serverId: "srv-1",
          hostname: "server-01",
          ipAddress: "10.0.0.1",
          applications: [
            {
              id: "app-1",
              appId: "app-1",
              serverId: "srv-1",
              portMappingId: "mapping-1",
              name: "App 1",
              port: 80,
              protocol: "HTTP",
              riskLevel: "Low",
            },
          ],
        },
      ],
      connections: [],
    };

    const mockApps = [
      { id: "app-1", appName: "App 1", ownerTeam: "team", risk: "Low", icon: "", techStack: "", labels: [], servers: [{ id: "srv-1", portMappingId: "mapping-1", hostname: "server-01", ipAddress: "10.0.0.1", portNumber: 80, protocol: "HTTP" }] },
      { id: "app-2", appName: "App 2", ownerTeam: "team", risk: "Low", icon: "", techStack: "", labels: [], servers: [{ id: "srv-2", portMappingId: "mapping-2", hostname: "server-02", ipAddress: "10.0.0.2", portNumber: 81, protocol: "HTTP" }] },
    ];

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/api/v1/topology/map") {
        return Promise.resolve({ data: mockDependencyMap });
      }
      if (url === "/api/v1/applications") {
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
    expect(result.current.edges.length).toBe(0);
    expect(result.current.availableApps.length).toBe(2);
  });

  it("updates rightPanelData on selection change for app node", async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/api/v1/topology/map") {
        return Promise.resolve({ data: { 
          servers: [
            { id: "srv-1", serverId: "srv-1", hostname: "test-server", ipAddress: "10.0.0.1", labels: [], applications: [{ id: "mapping-1", appId: "app-1", serverId: "srv-1", portMappingId: "mapping-1", name: "Test App", port: 443, protocol: "HTTPS", riskLevel: "High" }] }
          ], 
          connections: [] 
        }});
      }
      if (url === "/api/v1/applications") {
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

  it("handles auto map with environment normalization and specific query key invalidation", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useDependencyLogic(), { wrapper });

    await act(async () => {
      await result.current.handleAutoMap("production");
    });

    expect(result.current.selectedEnv).toBe("Production");
    expect(invalidateSpy).toHaveBeenCalledWith({ 
      queryKey: ["catalog-graph", "dependency-map", "mine:all", "Production", "All", []]
    });
  });

  it("syncs typed deployment identities without parsing node IDs", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { success: true } });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    
    const { result } = renderHook(() => useDependencyLogic(), { wrapper });

    await act(async () => {
      await result.current.handleSync();
    });

    expect(apiClient.put).toHaveBeenCalledWith(
      "/api/v1/topology/state",
      expect.objectContaining({
        dependencies: [
          { sourceAppId: "app-123", destAppId: "app-789", destinationPortMappingId: "mapping-789" }
        ]
      }),
      expect.objectContaining({ catalogView: "mine" }),
    );
    expect(apiClient.put).not.toHaveBeenCalledWith("/api/v1/dependencies/sync", expect.anything());
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["catalog-graph", "dependency-map"],
    });
  });

  it.each([
    ["Production environment", (value: ReturnType<typeof useDependencyLogic>) => value.setSelectedEnv("Production")],
    ["Development environment", (value: ReturnType<typeof useDependencyLogic>) => value.setSelectedEnv("Development")],
    ["datacenter", (value: ReturnType<typeof useDependencyLogic>) => value.setSelectedDatacenter("dc-1")],
    ["labels", (value: ReturnType<typeof useDependencyLogic>) => value.setSelectedLabels(["tier=api"])],
  ])("blocks topology save and standalone dependency sync for a narrowed %s", async (_name, narrow) => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/api/v1/topology/map") return Promise.resolve({ data: { servers: [], connections: [] } });
      if (url === "/api/v1/topology/state") return Promise.resolve({ data: { nodes: [], edges: [] } });
      return Promise.resolve({ data: [] });
    });
    const { result } = renderHook(() => useDependencyLogic(), { wrapper });
    act(() => narrow(result.current));
    vi.mocked(apiClient.put).mockClear();

    await act(async () => {
      await result.current.handleSaveNetworkState();
      await result.current.handleSync();
    });

    expect(apiClient.put).not.toHaveBeenCalledWith("/api/v1/topology/state", expect.anything());
    expect(apiClient.put).not.toHaveBeenCalledWith("/api/v1/dependencies/sync", expect.anything());
  });

  it("saves the complete graph through the versioned canonical state endpoint", async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/api/v1/topology/map") return Promise.resolve({ data: { servers: [], connections: [] } });
      if (url === "/api/v1/topology/state") return Promise.resolve({ data: { nodes: [], edges: [] } });
      if (url === "/api/v1/applications" || url === "/api/v1/servers") return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`Unknown URL: ${url}`));
    });
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useDependencyLogic(), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/api/v1/topology/state", expect.anything()));
    await act(async () => Promise.resolve());

    await act(async () => {
      await result.current.handleSaveNetworkState();
      await result.current.handleSaveNetworkState();
    });

    const stateCalls = vi.mocked(apiClient.put).mock.calls.filter(([url]) => url === "/api/v1/topology/state");
    expect(stateCalls).toHaveLength(2);
    expect(stateCalls[0][1]).toEqual(expect.objectContaining({ version: 0, dependencies: [] }));
    expect(stateCalls[1][1]).toEqual(expect.objectContaining({ version: 1, dependencies: [] }));
    expect(apiClient.put).not.toHaveBeenCalledWith("/api/v1/dependencies/sync", expect.anything());
  });

  it("clears stale dependency identity when reconnecting an edge", async () => {
    const { result } = renderHook(() => useDependencyLogic(), { wrapper });

    const appNode = (id: string, appId: string) => ({
      id,
      type: "appNode",
      position: { x: 0, y: 0 },
      data: { app: { id, appId, serverId: `server-${id}`, portMappingId: id } },
    });
    const oldEdge = {
      id: "e-1",
      source: "mapping-1",
      target: "mapping-2",
      data: {
        dependencyId: "dependency-old",
        referenceId: "dependency-old",
        destinationPortMappingId: "mapping-2",
        destinationServerId: "server-mapping-2",
      },
    };
    const newConnection = { source: "mapping-1", target: "mapping-3", sourceHandle: null, targetHandle: null };

    act(() => {
      result.current.setNodes([
        appNode("mapping-1", "app-1"),
        appNode("mapping-2", "app-2"),
        appNode("mapping-3", "app-3"),
      ]);
      result.current.setEdges([oldEdge]);
    });

    act(() => {
      result.current.onReconnect(oldEdge, newConnection);
    });

    await waitFor(() => {
      expect(result.current.edges[0]?.target).toBe("mapping-3");
      expect(result.current.edges[0]?.data).toBeUndefined();
      expect(toTopologyState(result.current.nodes, result.current.edges).edges[0]?.referenceId ?? null).toBeNull();
    });
  });

  it("does not render a late owner A graph response after switching to owner B", async () => {
    let resolveA!: (value: { data: unknown }) => void;
    let resolveB!: (value: { data: unknown }) => void;
    const requestA = new Promise<{ data: unknown }>((resolve) => { resolveA = resolve; });
    const requestB = new Promise<{ data: unknown }>((resolve) => { resolveB = resolve; });
    let mapCalls = 0;
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/api/v1/topology/map") return ++mapCalls === 1 ? requestA : requestB;
      if (url === "/api/v1/topology/state") return Promise.resolve({ data: { nodes: [], edges: [] } });
      return Promise.resolve({ data: [] });
    });
    const graph = (serverId: string, hostname: string) => ({
      servers: [{ serverId, hostname, ipAddress: "10.0.0.1", applications: [] }],
      connections: [],
    });

    const { result } = renderHook(() => useDependencyLogic(), { wrapper });
    await waitFor(() => expect(mapCalls).toBe(1));
    act(() => { setCatalogOwner(ownerB); });
    await waitFor(() => expect(mapCalls).toBe(2));

    await act(async () => { resolveB({ data: graph("server-b", "Catalog B") }); });
    await waitFor(() => expect(result.current.nodes.some((node) => node.id === "server-b")).toBe(true));
    await act(async () => { resolveA({ data: graph("server-a", "Catalog A") }); });

    expect(result.current.nodes.some((node) => node.id === "server-a")).toBe(false);
    expect(result.current.nodes.some((node) => node.id === "server-b")).toBe(true);
    const mapConfigs = vi.mocked(apiClient.get).mock.calls
      .filter(([url]) => url === "/api/v1/topology/map")
      .map(([, config]) => config);
    expect(mapConfigs).toHaveLength(2);
    expect(mapConfigs.every((config) => config?.signal instanceof AbortSignal)).toBe(true);
  });

  it("clusters servers into boundaryFrames when selectedLabels is provided and preserves 3-tier nesting", async () => {
    const mockDependencyMapWithLabels = {
      servers: [
        {
          id: "srv-1",
          serverId: "srv-1",
          hostname: "server-01",
          ipAddress: "10.0.0.1",
          labels: [{ key: "tier", value: "database" }],
          applications: [
            {
              id: "app-1",
              appId: "app-1",
              serverId: "srv-1",
              portMappingId: "mapping-1",
              name: "App 1",
              port: 5432,
              protocol: "TCP",
              riskLevel: "Low",
            },
          ],
        },
        {
          id: "srv-2",
          serverId: "srv-2",
          hostname: "server-02",
          ipAddress: "10.0.0.2",
          labels: [{ key: "tier", value: "database" }],
          applications: [],
        },
      ],
      connections: [],
    };

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/api/v1/topology/map") {
        return Promise.resolve({ data: mockDependencyMapWithLabels });
      }
      if (url === "/api/v1/applications") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/api/v1/topology/state") {
        return Promise.resolve({ data: { nodes: [], edges: [] } });
      }
      return Promise.reject(new Error("Unknown URL: " + url));
    });

    const { result } = renderHook(() => useDependencyLogic(), { wrapper });

    await waitFor(() => {
      expect(result.current.nodes.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.setSelectedLabels(["database"]);
    });

    await waitFor(() => {
      const boundaryFrames = result.current.nodes.filter(n => n.type === "boundaryFrame");
      expect(boundaryFrames.length).toBe(1);
    });

    const boundaryFrame = result.current.nodes.find(n => n.type === "boundaryFrame");
    expect(boundaryFrame).toBeDefined();
    expect(boundaryFrame?.zIndex).toBe(-2);
    expect(boundaryFrame?.data.name).toBe("Label: tier=database");

    const serverNodes = result.current.nodes.filter(n => n.type === "serverNode");
    expect(serverNodes.length).toBe(2);
    serverNodes.forEach(srv => {
      expect(srv.parentId).toBe(boundaryFrame?.id);
      expect(srv.extent).toBe("parent");
      expect(srv.zIndex).toBe(-1);
    });

    const appNode = result.current.nodes.find(n => n.type === "appNode");
    expect(appNode).toBeDefined();
    expect(appNode?.parentId).toBe("srv-1");
    expect(appNode?.extent).toBe("parent");
    expect(appNode?.zIndex).toBe(0);
  });

  it("protects 3-tier nesting invariant by ignoring appNode in onNodeDragStop", async () => {
    const { result } = renderHook(() => useDependencyLogic(), { wrapper });
    await waitFor(() => {
      expect(result.current.nodes.length).toBeGreaterThan(0);
    });

    const appNodeBefore = result.current.nodes.find(n => n.type === "appNode");
    if (appNodeBefore) {
      const initialParentId = appNodeBefore.parentId;
      act(() => {
        result.current.onNodeDragStop({} as any, appNodeBefore);
      });
      const appNodeAfter = result.current.nodes.find(n => n.id === appNodeBefore.id);
      expect(appNodeAfter?.parentId).toBe(initialParentId);
    }
  });
});

