import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ServerTable } from "../app/components/ServerTable";
import apiClient from "../shared/api/client";

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

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe("ServerTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockServers = [
    {
      id: "srv-1",
      ipAddress: "10.0.4.15",
      hostname: "prod-web-01",
      osType: "Ubuntu 22.04",
      environment: "Production",
      status: "Active",
      apps: []
    }
  ];

  it("renders server rows and applies SaaS monochromatic container styles", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockServers });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
                  <ServerTable 
          onRegister={vi.fn()} 
          onSelectResult={vi.fn()} 
          onClearFilter={vi.fn()} 
        />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.getByText("prod-web-01")).toBeDefined();
    });

    // Check container monochromatic background
    const container = screen.getByText("prod-web-01").closest("div.rounded-xl");
    expect(container).toBeDefined();
    expect(container?.className).toContain("bg-[#0c1322]");
    
    // Check border
    expect(container?.className).toContain("border-slate-900");
  });

  it("enforces monospaced font for IP addresses", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockServers });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
                  <ServerTable 
          onRegister={vi.fn()} 
          onSelectResult={vi.fn()} 
          onClearFilter={vi.fn()} 
        />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const ipCell = screen.getByText("10.0.4.15");
      expect(ipCell.className).toContain("font-mono");
    });
  });

  it("applies technical mono headers tracking-widest", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockServers });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
                  <ServerTable 
          onRegister={vi.fn()} 
          onSelectResult={vi.fn()} 
          onClearFilter={vi.fn()} 
        />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const header = screen.getByText("IP Address");
      expect(header.className).toContain("font-mono");
      expect(header.className).toContain("tracking-widest");
    });
  });
});
