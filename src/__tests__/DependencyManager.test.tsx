import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReactFlowProvider } from "@xyflow/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ServerGroupNode } from "../features/dependency-graph/components/ServerGroupNode";
import { DependencyManager } from "../app/pages/Dependency";
import apiClient from "../shared/api/client";
import { HeaderProvider } from "../app/hooks/useHeader";

// Mock the apiClient
vi.mock("../shared/api/client", () => ({
  default: {
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0 },
  },
});

// Mocking NodeProps as any to simplify test data setup
const mockNodeProps: any = {
  id: "srv-1",
  data: {
    server: {
      hostname: "prod-web-01",
      ipAddress: "10.0.0.1",
    },
    width: 300,
    height: 200,
  },
  selected: false,
  zIndex: 0,
  isConnectable: true,
  xPos: 0,
  yPos: 0,
  dragging: false,
};

describe("DependencyManager Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("renders ServerGroupNode via DependencyManager fetching", async () => {
    const mockMapData = {
      servers: [
        {
          id: "srv-1",
          serverId: "srv-1",
          hostname: "api-srv-01",
          ipAddress: "192.168.1.10",
          labels: [],
          applications: []
        }
      ],
      connections: []
    };

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes("/api/v1/topology/map")) {
        return Promise.resolve({ data: mockMapData });
      }
      if (url.includes("/api/v1/applications")) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes("/api/v1/topology/state")) return Promise.resolve({ data: { nodes: [], edges: [] } });
      return Promise.resolve({ data: [] });
    });

    render(
      <QueryClientProvider client={queryClient}>
        
          <HeaderProvider>
            <MemoryRouter>
              <DependencyManager />
            </MemoryRouter>
          </HeaderProvider>
        
      </QueryClientProvider>
    );

    // Verify loading state (skeleton or text)
    expect(screen.getByText(/Building dependency graph/i)).toBeDefined();

    // Wait for data
    await waitFor(() => {
      expect(screen.getByText("api-srv-01")).toBeDefined();
    });

    expect(screen.getByText("192.168.1.10")).toBeDefined();
  });

  it("toggles App Palette visibility", async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes("/api/v1/topology/state")) {
        return Promise.resolve({ data: { version: 0, nodes: [], edges: [] } });
      }
      if (url.includes("/api/v1/topology/map")) {
        return Promise.resolve({ data: { servers: [], connections: [] } });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <QueryClientProvider client={queryClient}>
        
          <HeaderProvider>
            <MemoryRouter>
              <DependencyManager />
            </MemoryRouter>
          </HeaderProvider>
        
      </QueryClientProvider>
    );

    // Initially closed (translated out)
    const drawer = screen.getByText("App Palette").closest(".absolute");
    expect(drawer?.className).toContain("-translate-x-full");

    // Toggle button should be visible
    const openButton = await screen.findByText(/\+ App Palette/i);
    expect(openButton).toBeDefined();

    // Click to reopen
    fireEvent.click(openButton);
    
    await waitFor(() => {
      expect(drawer?.className).toContain("translate-x-0");
    });

    // Find and click the close button inside AppPalette using its aria-label
    const closeButton = screen.getByLabelText("Close Palette");
    fireEvent.click(closeButton);

    // Palette should be translated out
    await waitFor(() => {
      expect(drawer?.className).toContain("-translate-x-full");
    });
  });
});

describe("ServerGroupNode", () => {
  const wrap = (ui: React.ReactElement) => render(
    <QueryClientProvider client={queryClient}>
      <ReactFlowProvider>
        {ui}
      </ReactFlowProvider>
    </QueryClientProvider>
  );

  it("renders with dashed border and correct server details", () => {
    wrap(<ServerGroupNode {...mockNodeProps} />);

    // Check for hostname
    expect(screen.getByText("prod-web-01")).toBeDefined();
    
    // Check for IP address
    expect(screen.getByText("10.0.0.1")).toBeDefined();

    // Check for dashed border class
    const container = screen.getByText("prod-web-01").closest(".border-dashed");
    expect(container).toBeDefined();
    expect(container?.className).toContain("border-border");
  });
});

