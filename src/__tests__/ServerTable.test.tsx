import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ServerTable } from "../app/components/ServerTable";
import apiClient from "../shared/api/client";

// Mock the useNavigate hook
const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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
      environment: "Development",
      status: "Active",
      apps: []
    }
  ];

  it("routes to dependency manager with lowercase environment parameter", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockServers });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        
          <MemoryRouter>
            <ServerTable 
              onEditClick={vi.fn()}
              onMigrateClick={vi.fn()}
              onDeleteClick={vi.fn()}
              onSelectResult={vi.fn()} 
              onClearFilter={vi.fn()} 
            />
          </MemoryRouter>
        
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("prod-web-01")).toBeDefined();
    });

    const depButton = screen.getByTitle("View Dependency");
    fireEvent.click(depButton);

    expect(mockNavigate).toHaveBeenCalledWith("/dependency-manager?entityId=srv-1&type=server&environment=development");
  });

  it("renders server rows and applies SaaS monochromatic container styles", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockServers });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        
          <MemoryRouter>
            <ServerTable 
              onEditClick={vi.fn()}
              onMigrateClick={vi.fn()}
              onDeleteClick={vi.fn()}
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

    // Check row styles
    const container = screen.getByText("prod-web-01").closest("tr");
    expect(container).toBeDefined();
    expect(container?.className).toContain("group");
    
    // Check border
    expect(container?.className).toContain("border-border");
  });

  it("enforces monospaced font for IP addresses", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockServers });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        
          <MemoryRouter>
            <ServerTable 
              onEditClick={vi.fn()}
              onMigrateClick={vi.fn()}
              onDeleteClick={vi.fn()}
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
              onEditClick={vi.fn()}
              onMigrateClick={vi.fn()}
              onDeleteClick={vi.fn()}
              onSelectResult={vi.fn()} 
              onClearFilter={vi.fn()} 
            />
          </MemoryRouter>
        
      </QueryClientProvider>
    );

    await waitFor(() => {
      const headerText = screen.getByText("IP Address");
      const headerCell = headerText.closest("th");
      expect(headerCell).toBeDefined();
      expect(headerCell?.className).toContain("font-label");
      expect(headerCell?.className).toContain("tracking-widest");
    });
  });
});


