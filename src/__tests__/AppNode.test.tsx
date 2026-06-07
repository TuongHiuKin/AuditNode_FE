import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ReactFlowProvider } from "@xyflow/react";
import { AppNode } from "../features/dependency-graph/components/AppNode";

describe("AppNode", () => {
  const mockProps: any = {
    data: {
      app: {
        appName: "Payment Gateway",
        portNumber: 443,
        icon: "Shield",
      },
    },
    selected: false,
  };

  const wrap = (ui: React.ReactElement) => render(
    <ReactFlowProvider>
      {ui}
    </ReactFlowProvider>
  );

  it("renders application name and port number", () => {
    wrap(<AppNode {...mockProps} />);
    expect(screen.getByText("Payment Gateway")).toBeDefined();
    expect(screen.getByText("443")).toBeDefined();
  });

  it("renders as a sharp rectangle (rounded-none)", () => {
    const { container } = wrap(<AppNode {...mockProps} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain("rounded-none");
    expect(nodeDiv.className).not.toContain("rounded-lg");
  });

  it("has invisible interactive handles on all four sides", () => {
    const { container } = wrap(<AppNode {...mockProps} />);
    // There should be 8 handles total (4 target, 4 source)
    const handles = container.querySelectorAll(".react-flow__handle");
    expect(handles.length).toBe(8);
    
    handles.forEach(handle => {
      expect(handle.className).toContain("opacity-0");
      expect(handle.className).not.toContain("pointer-events-none");
      expect(handle.className).toContain("bg-blue-500");
    });
  });

  it("applies tertiary border and shadow when selected", () => {
    const selectedProps = { ...mockProps, selected: true };
    const { container } = wrap(<AppNode {...selectedProps} />);
    const nodeDiv = container.firstChild as HTMLElement;
    expect(nodeDiv.className).toContain("border-tertiary");
    expect(nodeDiv.className).toContain("shadow-[0_0_15px_rgba(255,77,126,0.15)]");
  });

  it("enforces monospaced font for port number", () => {
    wrap(<AppNode {...mockProps} />);
    const portSpan = screen.getByText("443");
    expect(portSpan.className).toContain("font-mono");
  });
});
