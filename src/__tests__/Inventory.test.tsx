import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Inventory } from "../app/pages/Inventory";
import apiClient from "../shared/api/client";

// Mock dependencies
vi.mock("../shared/api/client", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  },
}));

vi.mock("../app/hooks/useHeader", () => ({
  useHeader: () => ({
    setHeader: vi.fn(),
  }),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe("Inventory Page Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockApps = [
    {
      id: "app-1",
      appCode: "APP-001",
      appName: "Test Application",
      risk: "Low",
      servers: [
        { id: "srv-1", hostname: "server-01", ipAddress: "192.168.1.1", portNumber: 80, protocol: "http" }
      ]
    }
  ];

  const mockServers = [
    { id: "srv-1", hostname: "server-01", ipAddress: "192.168.1.1", environment: "Development", applications: [] }
  ];

  it("opens delete confirmation modal when clicking delete on an app", async () => {
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url === "/api/Applications") return Promise.resolve({ data: mockApps });
      if (url.includes("dependencies-count")) return Promise.resolve({ data: { count: 0 } });
      return Promise.resolve({ data: [] });
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Inventory />
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByText("Applications"));
    await waitFor(() => screen.getByText("Test Application"));

    const deleteBtns = screen.getAllByTitle("Delete");
    fireEvent.click(deleteBtns[0]);

    await waitFor(() => {
      expect(screen.getByText("Hard Delete Application")).toBeDefined();
    });
  });
});
