import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppPalette } from "../features/dependency-graph/components/AppPalette";

describe("AppPalette", () => {
  const mockAvailableApps = [
    {
      id: "app-1",
      appName: "Payment Gateway",
      ownerId: "team-1",
      portNumber: 443,
      protocol: "HTTPS",
      icon: "Shield",
      techStack: "Java",
      isMapped: false,
    },
    {
      id: "app-2",
      appName: "Auth Service",
      ownerId: "team-2",
      portNumber: 8080,
      protocol: "HTTP",
      icon: "Globe",
      techStack: "Node.js",
      isMapped: false,
    },
  ];

  it("renders the list of available applications", () => {
    render(<AppPalette availableApps={mockAvailableApps} isLoading={false} />);
    expect(screen.getByText("Payment Gateway")).toBeDefined();
    expect(screen.getByText("Auth Service")).toBeDefined();
  });

  it("shows skeleton loaders when isLoading is true", () => {
    const { container } = render(<AppPalette availableApps={[]} isLoading={true} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows empty state when no apps are available", () => {
    render(<AppPalette availableApps={[]} isLoading={false} />);
    expect(screen.getByText(/All applications are currently mapped on the canvas/i)).toBeDefined();
  });

  it("sets dataTransfer on drag start", () => {
    render(<AppPalette availableApps={mockAvailableApps} isLoading={false} />);
    const appItem = screen.getByText("Payment Gateway").closest("div[draggable]");
    
    const dataTransfer = {
      setData: vi.fn(),
      effectAllowed: "",
    };

    if (appItem) {
      fireEvent.dragStart(appItem, { dataTransfer });
      expect(dataTransfer.setData).toHaveBeenCalledWith("application/reactflow", "app-1");
      expect(dataTransfer.effectAllowed).toBe("move");
    } else {
      throw new Error("App item not found");
    }
  });
});
