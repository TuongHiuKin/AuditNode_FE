import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppPalette } from "../features/dependency-graph/components/AppPalette";

describe("AppPalette capabilities", () => {
  const app = { id: "deployment-1", appName: "Payments", icon: "Globe" } as never;
  it("prevents dragging applications in read-only mode", () => {
    render(<AppPalette availableApps={[app]} isLoading={false} readOnly />);
    expect(screen.getByText("Payments").closest("div[draggable]")).toHaveAttribute("draggable", "false");
  });
});
