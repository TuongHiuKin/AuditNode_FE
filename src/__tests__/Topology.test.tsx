import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { Topology } from "../app/pages/Topology";
import apiClient from "../shared/api/client";
import { HeaderProvider } from "../app/hooks/useHeader";
import React from "react";

// Mock the apiClient
vi.mock("../shared/api/client", () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock useTopologyLogic
vi.mock("../features/dependency-graph/hooks/useTopologyLogic", () => ({
  useTopologyLogic: vi.fn(),
}));

import { useTopologyLogic } from "../features/dependency-graph/hooks/useTopologyLogic";

// Mock React Flow components
vi.mock("@xyflow/react", async () => {
  const actual = await vi.importActual("@xyflow/react");
  return {
    ...actual,
    ReactFlow: ({ children }: any) => <div data-testid="topology-flow">{children}</div>,
    Background: () => <div data-testid="rf-background" />,
    MiniMap: () => <div data-testid="rf-minimap" />,
    Controls: () => <div data-testid="rf-controls" />,
    ReactFlowProvider: ({ children }: any) => <div>{children}</div>,
    useReactFlow: () => ({ 
      fitView: vi.fn(), 
      screenToFlowPosition: vi.fn(),
      setCenter: vi.fn(),
      getNodes: vi.fn(() => []),
    }),
    useNodesState: (initial: any) => [initial, vi.fn(), vi.fn()],
    useEdgesState: (initial: any) => [initial, vi.fn(), vi.fn()],
  };
});

// Mock GraphToolbar to avoid nested Controls issues
vi.mock("../features/dependency-graph/components/GraphToolbar", () => ({
  GraphToolbar: () => <div data-testid="graph-toolbar" />,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0 },
  },
});

describe("Topology Page (Isolated Refactor)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    
    vi.mocked(useTopologyLogic).mockReturnValue({
      nodes: [],
      edges: [],
      onNodesChange: vi.fn(),
      onEdgesChange: vi.fn(),
      onSelectionChange: vi.fn(),
      onNodeDoubleClick: vi.fn(),
      refetch: vi.fn(),
      isLoading: false,
      selectedItem: { type: null, id: null },
      setSelectedItem: vi.fn(),
      rightPanelData: null,
      setRightPanelData: vi.fn(),
      selectedEnv: "All",
      setSelectedEnv: vi.fn(),
      selectedDatacenter: "All",
      setSelectedDatacenter: vi.fn(),
      appSearchQuery: "",
      setAppSearchQuery: vi.fn(),
    } as any);
  });

  it("renders the isolated topology flow canvas", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HeaderProvider>
            <Topology />
          </HeaderProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByTestId("topology-flow")).toBeDefined();
    expect(screen.getByText("Environment")).toBeDefined();
  });

  it("calculates inventory assets correctly from nodes", async () => {
    vi.mocked(useTopologyLogic).mockReturnValue({
      nodes: [
        { id: "s1", type: "topologyServerNode" },
        { id: "s2", type: "topologyServerNode" },
        { id: "a1", type: "topologyAppNode" },
      ],
      edges: [],
      isLoading: false,
      refetch: vi.fn(),
      selectedItem: { type: null, id: null },
      selectedEnv: "All",
      selectedDatacenter: "All",
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HeaderProvider>
            <Topology />
          </HeaderProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/Total Assets: 2/)).toBeDefined();
  });
});
