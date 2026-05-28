import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReactFlowProvider } from "@xyflow/react";
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
    const mockGraph = {
      servers: [
        {
          id: "srv-1",
          hostname: "api-srv-01",
          ipAddress: "192.168.1.10",
          applications: []
        }
      ],
      connections: []
    };

    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.includes("/api/Topology/map")) {
        return Promise.resolve({ data: mockGraph });
      }
      if (url.includes("/api/Topology/status")) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <HeaderProvider>
          <DependencyManager />
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
    expect(container?.className).toContain("border-slate-800");
  });
});

