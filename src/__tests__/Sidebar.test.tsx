import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router";
import { Sidebar } from "../app/components/Sidebar";

describe("Sidebar", () => {
  it("renders AuditNode logo correctly", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByText("Audit")).toBeDefined();
    expect(screen.getByText("Node")).toBeDefined();
  });

  it("renders all navigation items", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByText("Inventory")).toBeDefined();
    expect(screen.getByText("Topology Map")).toBeDefined();
    expect(screen.getByText("Dependencies")).toBeDefined();
  });

  it("applies standardized SaaS active state classes", () => {
    // MemoryRouter defaults to '/inventory' to match Infrastructure Inventory
    render(
      <MemoryRouter initialEntries={["/inventory"]}>
        <Sidebar />
      </MemoryRouter>
    );
    const activeLink = screen.getByText("Inventory").closest("a");
    expect(activeLink?.className).toContain("bg-primary/10");
    expect(activeLink?.className).toContain("text-primary");
    expect(activeLink?.className).toContain("ring-1");
  });

  it("applies professional monochromatic inactive state classes", () => {
    render(
      <MemoryRouter initialEntries={["/inventory"]}>
        <Sidebar />
      </MemoryRouter>
    );
    const inactiveLink = screen.getByText("Topology Map").closest("a");
    expect(inactiveLink?.className).toContain("text-muted-foreground");
    expect(inactiveLink?.className).toContain("hover:text-foreground");
  });
});
