import { render, screen, fireEvent } from "@testing-library/react";
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
    expect(nodeDiv.className).toContain("border-primary");
    expect(nodeDiv.className).toContain("bg-primary/5");
  });

  it("calculates correct dimensions in handleAutoFit", () => {
    const setNodes = vi.fn();
    vi.mocked(useReactFlow).mockReturnValue({
      getNodes: () => [
        { id: "app-1", parentId: "srv-1", position: { x: 10, y: 10 }, measured: { width: 100, height: 40 } },
        { id: "app-2", parentId: "srv-1", position: { x: 50, y: 50 }, measured: { width: 100, height: 40 } },
      ],
      setNodes,
    } as any);

    wrap(<ServerGroupNode {...mockProps} />);
    const fitButton = screen.getByTitle("Auto-fit to children");
    fireEvent.click(fitButton);

    // Verify setNodes was called
    expect(setNodes).toHaveBeenCalled();
    
    // Get the function passed to setNodes
    const updateFn = setNodes.mock.calls[0][0];
    const updatedNodes = updateFn([{ id: "srv-1", style: {}, data: {} }, { id: "app-1", parentId: "srv-1", position: { x: 10, y: 10 } }]);
    
    const srvNode = updatedNodes.find((n: any) => n.id === "srv-1");
    // maxX = 50 + 100 = 150. maxY = 50 + 40 = 90.
    // padding = 40. topPadding = 60.
    // minX = 10 < 40 -> offsetX = 30. minY = 10 < 60 -> offsetY = 50.
    // newWidth = max(150 + 40, 280) = 280.
    // newHeight = max(90 + 40, 120) = 130.
    expect(srvNode.style.width).toBe(280);
    expect(srvNode.style.height).toBe(130);
  });
});
