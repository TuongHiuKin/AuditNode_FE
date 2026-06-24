import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LabelBadge } from "../app/components/LabelBadge";

describe("LabelBadge", () => {
  it("renders key and value correctly", () => {
    const label = { key: "PROJECT", value: "COREBANKING" };
    render(<LabelBadge label={label} />);
    
    expect(screen.getByText("PROJECT:")).toBeDefined();
    expect(screen.getByText("COREBANKING")).toBeDefined();
  });

  it("applies semantic fallback classes when colorHex is missing", () => {
    const label = { key: "ENV", value: "PROD" };
    const { container } = render(<LabelBadge label={label} />);
    const badge = container.firstChild as HTMLElement;
    
    expect(badge.className).toContain("bg-surface");
    expect(badge.className).toContain("border-border");
    expect(badge.className).toContain("text-foreground");
  });

  it("applies custom inline styles when colorHex is provided", () => {
    const label = { key: "ENV", value: "PROD", colorHex: "#ff0000" };
    const { container } = render(<LabelBadge label={label} />);
    const badge = container.firstChild as HTMLElement;
    
    expect(badge.style.backgroundColor).toBe("rgba(255, 0, 0, 0.125)"); // #ff000020 is approx rgba equivalent or simply check the string based on jsdom parsing
    // JSDOM might parse hex+alpha differently, let's just check color
    expect(badge.style.color).toBe("rgb(255, 0, 0)"); // #ff0000
    expect(badge.className).not.toContain("bg-surface");
  });
});
