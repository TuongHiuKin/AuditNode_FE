import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ReactFlowProvider } from "@xyflow/react";
import { ServerGroupNode } from "../features/dependency-graph/components/ServerGroupNode";

// Mock useReactFlow
vi.mock("@xyflow/react", async () => {
  const actual = await vi.importActual("@xyflow/react");
  return {
    ...actual,
    useReactFlow: vi.fn(),
  };
});

import { useReactFlow } from "@xyflow/react";

describe("ServerGroupNode", () => {
  const mockProps: any = {
    id: "srv-1",
    data: {
      server: {
        hostname: "prod-web-01",
        ipAddress: "10.0.4.15",
        osType: "Ubuntu 22.04",
      },
      width: 280,
      height: 120,
    },
    selected: false,
  };

  const wrap = (ui: React.ReactElement) => render(
    <ReactFlowProvider>
      {ui}
    </ReactFlowProvider>
  );

  it("renders server hostname, IP, and Auto-fit button", () => {
    vi.mocked(useReactFlow).mockReturnValue({
      getNodes: () => [],
    } as any);

    wrap(<ServerGroupNode {...mockProps} />);
    expect(screen.getByText("prod-web-01")).toBeDefined();
    expect(screen.getByText("10.0.4.15")).toBeDefined();
    expect(screen.getByTitle("Auto-fit to children")).toBeDefined();
  });

  it("prioritizes width and height props over data values", () => {
    vi.mocked(useReactFlow).mockReturnValue({
      getNodes: () => [],
    } as any);

    const propsWithExplicitSize = { 
      ...mockProps, 
      width: 500, 
      height: 300 
    };
    
    const { container } = wrap(<ServerGroupNode {...propsWithExplicitSize} />);
    const nodeDiv = container.querySelector("div") as HTMLElement;
    
    expect(nodeDiv.style.width).toBe("500px");
    expect(nodeDiv.style.height).toBe("300px");
  });

  it("falls back to data.width/height if props are missing", () => {
    vi.mocked(useReactFlow).mockReturnValue({
      getNodes: () => [],
    } as any);

    const { container } = wrap(<ServerGroupNode {...mockProps} />);
    const nodeDiv = container.querySelector("div") as HTMLElement;
    
    expect(nodeDiv.style.width).toBe("280px");
    expect(nodeDiv.style.height).toBe("120px");
  });

  it("applies selected styles when selected prop is true", () => {
    vi.mocked(useReactFlow).mockReturnValue({
      getNodes: () => [],
    } as any);

    const selectedProps = { ...mockProps, selected: true };
    const { container } = wrap(<ServerGroupNode {...selectedProps} />);
    const nodeDiv = container.querySelector("div") as HTMLElement;
    expect(nodeDiv.className).toContain("border-tertiary");
    expect(nodeDiv.className).toContain("bg-tertiary/5");
  });
});
