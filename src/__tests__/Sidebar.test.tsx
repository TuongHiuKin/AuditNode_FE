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
    expect(screen.getByText("Infrastructure Inventory")).toBeDefined();
    expect(screen.getByText("Topology Map")).toBeDefined();
    expect(screen.getByText("Dependency Manager")).toBeDefined();
  });

  it("applies standardized SaaS active state classes", () => {
    // MemoryRouter defaults to '/inventory' to match Infrastructure Inventory
    render(
      <MemoryRouter initialEntries={["/inventory"]}>
        <Sidebar />
      </MemoryRouter>
    );
    const activeLink = screen.getByText("Infrastructure Inventory").closest("a");
    expect(activeLink?.className).toContain("bg-slate-900/50");
    expect(activeLink?.className).toContain("text-tertiary");
    expect(activeLink?.className).toContain("border-slate-800");
  });

  it("applies professional monochromatic inactive state classes", () => {
    render(
      <MemoryRouter initialEntries={["/inventory"]}>
        <Sidebar />
      </MemoryRouter>
    );
    const inactiveLink = screen.getByText("Topology Map").closest("a");
    expect(inactiveLink?.className).toContain("text-secondary");
    expect(inactiveLink?.className).toContain("hover:text-primary");
  });
});
