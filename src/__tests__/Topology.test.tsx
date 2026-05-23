import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Topology } from "../app/pages/Topology";

// Mock fetch
global.fetch = vi.fn();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0 },
  },
});

describe("Topology Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("renders the Datacenter node and micro-dot background", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Topology />
      </QueryClientProvider>
    );

    // Verify header
    expect(screen.getByText("Topology Network Map")).toBeDefined();

    // Verify Datacenter node after loading
    await waitFor(() => {
      expect(screen.getByText("Corporate Datacenter")).toBeDefined();
    });

    // Verify micro-dot background style presence
    const canvas = screen.getByText("Corporate Datacenter").closest("div.flex-1.relative");
    expect(canvas?.style.backgroundImage).toContain("radial-gradient");
  });

  it("renders server nodes when data is fetched", async () => {
    const mockData = [
      {
        id: "s1",
        ipAddress: "10.0.0.1",
        hostname: "web-srv-01",
        ports: [
          { id: "p1", portNumber: 80, appName: "HTTP" }
        ]
      }
    ];

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Topology />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("web-srv-01")).toBeDefined();
      expect(screen.getByText("10.0.0.1")).toBeDefined();
      expect(screen.getByText("HTTP")).toBeDefined();
      expect(screen.getByText("80")).toBeDefined();
    });
  });
});
