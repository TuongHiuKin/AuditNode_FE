import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppTable } from "../app/components/AppTable";
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

describe("AppTable Reproduction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'N/A' when app.risk is undefined instead of crashing", async () => {
    const mockData = [
      {
        id: "1",
        appCode: "APP-001",
        appName: "Test App",
        ownerId: "OWNER-1",
        // risk: "High", // Intentionally omitted
        desc: "Test Description",
        servers: []
      }
    ];

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
                  <AppTable 
          onRegister={vi.fn()} 
          onEditClick={vi.fn()}
          onMigrateClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onSelectResult={vi.fn()} 
          onClearFilter={vi.fn()} 
        />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for the skeleton to disappear and the data to render
    await waitFor(() => {
      expect(screen.getByText("Test App")).toBeDefined();
    });

    // Assert that "N/A" is rendered for the risk level
    expect(screen.getByText("N/A")).toBeDefined();
  });

  it("applies sub-acute rose theme for HIGH risk level", async () => {
    const mockData = [
      {
        id: "2",
        appCode: "APP-H",
        appName: "High Risk App",
        ownerId: "OWNER-2",
        risk: "High",
        servers: []
      }
    ];

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
                  <AppTable 
          onRegister={vi.fn()} 
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
      // Find specifically the span that contains High/Medium to avoid matching app names
      const badges = screen.getAllByText(/High|Medium/i);
      const riskBadge = badges.find(el => el.tagName === "SPAN" && el.className.includes("border"));
      expect(riskBadge).toBeDefined();
      if (riskBadge) {
        expect(riskBadge.className).toContain("text-rose-400");
        expect(riskBadge.className).toContain("bg-rose-500/10");
      }
    });
  });

  it("applies amber theme for MEDIUM risk level", async () => {
    const mockData = [
      {
        id: "3",
        appCode: "APP-M",
        appName: "Medium Risk App",
        ownerId: "OWNER-3",
        risk: "Medium",
        servers: []
      }
    ];

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
                  <AppTable 
          onRegister={vi.fn()} 
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
      const badges = screen.getAllByText(/High|Medium/i);
      const riskBadge = badges.find(el => el.tagName === "SPAN" && el.className.includes("border"));
      expect(riskBadge).toBeDefined();
      if (riskBadge) {
        expect(riskBadge.className).toContain("text-amber-400");
        expect(riskBadge.className).toContain("bg-amber-500/10");
      }
    });
  });

  it("renders 'UNKNOWN' when srv.protocol is undefined", async () => {
    const mockData = [
      {
        id: "1",
        appCode: "APP-001",
        appName: "Test App",
        ownerId: "OWNER-1",
        risk: "High",
        desc: "Test Description",
        servers: [
          {
            id: "s1",
            ipAddress: "1.1.1.1",
            hostname: "test-host",
            portNumber: 8080,
            // protocol: "http", // Intentionally omitted
          }
        ]
      }
    ];

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
                  <AppTable 
          onRegister={vi.fn()} 
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
      expect(screen.getByText("Test App")).toBeDefined();
    });

    // Expand the row to show servers
    const row = screen.getByText("APP-001");
    row.click();

    await waitFor(() => {
      expect(screen.getByText("UNKNOWN")).toBeDefined();
    });
  });

  it("renders nested server details correctly", async () => {
    const mockData = [
      {
        id: "1",
        appCode: "APP-001",
        appName: "Test App",
        ownerId: "OWNER-1",
        risk: "Low",
        servers: [
          {
            id: "s1",
            ipAddress: "10.0.0.1",
            hostname: "prod-server-01",
            portNumber: 443,
            protocol: "https"
          }
        ]
      }
    ];

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
                  <AppTable 
          onRegister={vi.fn()} 
          onEditClick={vi.fn()}
          onMigrateClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onSelectResult={vi.fn()} 
          onClearFilter={vi.fn()} 
        />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText("Test App")).toBeDefined());

    // Expand
    screen.getByText("APP-001").click();

    await waitFor(() => {
      expect(screen.getByText("prod-server-01")).toBeDefined();
      expect(screen.getByText("10.0.0.1")).toBeDefined();
      expect(screen.getByText("443")).toBeDefined();
      expect(screen.getByText("HTTPS")).toBeDefined();
    });
  });
});
