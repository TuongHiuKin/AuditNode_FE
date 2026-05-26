import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DetailsPanel } from "../features/dependency-graph/components/DetailsPanel";

describe("DetailsPanel", () => {
  const mockOnClose = vi.fn();

  it("renders app node details correctly", () => {
    const rightPanelData = {
      app: {
        appName: "Test App",
        portNumber: 8080,
        techStack: "React",
        ownerId: "Team A",
      },
      server: {
        hostname: "srv-01",
        ipAddress: "10.0.0.1",
      },
    };

    render(
      <DetailsPanel
        selectedItem={{ type: "node", id: "app-1" }}
        rightPanelData={rightPanelData}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Test App")).toBeDefined();
    expect(screen.getByText(/8080/)).toBeDefined();
    expect(screen.getByText("React")).toBeDefined();
    expect(screen.getByText("Team A")).toBeDefined();
    expect(screen.getByText("srv-01")).toBeDefined();
    expect(screen.getByText("10.0.0.1")).toBeDefined();
  });

  it("renders server details correctly", () => {
    const rightPanelData = {
      server: {
        hostname: "dedicated-server",
        ipAddress: "192.168.1.50",
      },
    };

    render(
      <DetailsPanel
        selectedItem={{ type: "server", id: "srv-1" }}
        rightPanelData={rightPanelData}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("dedicated-server")).toBeDefined();
    expect(screen.getByText("192.168.1.50")).toBeDefined();
  });

  it("renders edge details correctly", () => {
    const rightPanelData = {
      sourceApp: { appName: "Source App", portNumber: 1111 },
      targetApp: { appName: "Target App", portNumber: 2222 },
      protocol: "HTTPS",
    };

    render(
      <DetailsPanel
        selectedItem={{ type: "edge", id: "edge-1" }}
        rightPanelData={rightPanelData}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Source App")).toBeDefined();
    expect(screen.getByText("Target App")).toBeDefined();
    expect(screen.getByText("HTTPS")).toBeDefined();
    expect(screen.getAllByText(/1111/)).toBeDefined();
    expect(screen.getAllByText(/2222/)).toBeDefined();
  });

  it("calls onClose when close button is clicked", () => {
    render(
      <DetailsPanel
        selectedItem={{ type: "node", id: "app-1" }}
        rightPanelData={{ app: { appName: "X" } }}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByRole("button"));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
