import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PaletteSidebar } from "../features/dependency-graph/components/PaletteSidebar";

describe("PaletteSidebar", () => {
  const mockPaletteApps = [
    {
      id: "app-1",
      appName: "Payment Gateway",
      ownerId: "team-1",
      portNumber: 443,
      protocol: "HTTPS",
      icon: "Shield",
      techStack: "Java",
    },
    {
      id: "app-2",
      appName: "Auth Service",
      ownerId: "team-2",
      portNumber: 8080,
      protocol: "HTTP",
      icon: "Globe",
      techStack: "Node.js",
    },
  ];

  it("renders the list of applications", () => {
    render(<PaletteSidebar paletteApps={mockPaletteApps} />);
    expect(screen.getByText("Payment Gateway")).toBeDefined();
    expect(screen.getByText("Auth Service")).toBeDefined();
  });

  it("shows skeleton loaders when paletteApps is empty", () => {
    const { container } = render(<PaletteSidebar paletteApps={[]} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("sets dataTransfer on drag start", () => {
    render(<PaletteSidebar paletteApps={mockPaletteApps} />);
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
