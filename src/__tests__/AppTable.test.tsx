import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { AppTable } from "../app/components/AppTable";

// Mock fetch
global.fetch = vi.fn();

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

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(
      <MemoryRouter>
        <AppTable />
      </MemoryRouter>
    );

    // Wait for the skeleton to disappear and the data to render
    await waitFor(() => {
      expect(screen.getByText("Test App")).toBeDefined();
    });

    // Assert that "N/A" is rendered for the risk level
    expect(screen.getByText("N/A")).toBeDefined();
  });

  it("renders 'UNKNOWN' when srv.environment is undefined", async () => {
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
            osType: "Linux",
            // environment: "Production", // Intentionally omitted
            status: "Active"
          }
        ]
      }
    ];

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(
      <MemoryRouter>
        <AppTable />
      </MemoryRouter>
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



});
