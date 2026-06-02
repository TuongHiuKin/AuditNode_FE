import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { TopologyServerNode } from "../features/dependency-graph/components/TopologyServerNode";
import React from "react";

vi.mock("@xyflow/react", async () => {
  const actual = await vi.importActual("@xyflow/react");
  return {
    ...actual,
    useReactFlow: vi.fn(),
  };
});

describe("TopologyServerNode (Isolated)", () => {
  const setNodesMock = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useReactFlow).mockReturnValue({
      setNodes: setNodesMock,
    } as any);
  });

  const mockProps: any = {
    id: "srv-1",
    data: {
      server: {
        hostname: "iso-srv-01",
        ipAddress: "192.168.1.1",
        environment: "PROD",
      },
      appCount: 5,
      isExpanded: false,
      width: 240,
      height: 90,
    },
  };

  const wrap = (ui: React.ReactElement) => render(
    <ReactFlowProvider>
      {ui}
    </ReactFlowProvider>
  );

  it("renders in collapsed state with blue PROD border", () => {
    wrap(<TopologyServerNode {...mockProps} />);
    expect(screen.getByText("iso-srv-01")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
    
    const nodeDiv = screen.getByText("iso-srv-01").closest("div.bg-\\[\\#0c1322\\]");
    expect(nodeDiv?.className).toContain("border-blue-500/60");
  });

  it("toggles expansion state in data on click", () => {
    wrap(<TopologyServerNode {...mockProps} />);
    fireEvent.click(screen.getByText("iso-srv-01"));
    
    expect(setNodesMock).toHaveBeenCalled();
    const updateFn = setNodesMock.mock.calls[0][0];
    const result = updateFn([{ id: "srv-1", data: mockProps.data }]);
    expect(result[0].data.isExpanded).toBe(true);
    expect(result[0].data.width).toBe(400);
  });
});
