import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { ServerTable } from "../app/components/ServerTable";

// Mock fetch
global.fetch = vi.fn();

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
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockServers,
    });

    render(
      <MemoryRouter>
        <ServerTable />
      </MemoryRouter>
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
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockServers,
    });

    render(
      <MemoryRouter>
        <ServerTable />
      </MemoryRouter>
    );

    await waitFor(() => {
      const ipCell = screen.getByText("10.0.4.15");
      expect(ipCell.className).toContain("font-mono");
    });
  });

  it("applies technical mono headers tracking-widest", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockServers,
    });

    render(
      <MemoryRouter>
        <ServerTable />
      </MemoryRouter>
    );

    await waitFor(() => {
      const header = screen.getByText("IP Address");
      expect(header.className).toContain("font-mono");
      expect(header.className).toContain("tracking-widest");
    });
  });
});
