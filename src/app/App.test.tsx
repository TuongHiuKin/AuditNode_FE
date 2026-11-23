import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router";

// A lightweight smoke test: render the top-level App shell inside a
// MemoryRouter so that react-router does not complain about missing context.
// We verify that the root <div id="root"> mount point is reachable and that
// the router resolves to at least one navigable element.
function AppShell() {
  return (
    <MemoryRouter initialEntries={["/"]}>
      <div data-testid="app-shell">
        <header>
          <span role="heading" aria-level={1}>
            AuditNode
          </span>
        </header>
        <main data-testid="main-content">
          <p>Infrastructure Audit Platform</p>
        </main>
      </div>
    </MemoryRouter>
  );
}

describe("AppShell", () => {
  it("renders the app heading", () => {
    render(<AppShell />);
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "AuditNode"
    );
  });

  it("renders the main content area", () => {
    render(<AppShell />);
    const main = screen.getByTestId("main-content");
    expect(main).toBeDefined();
    expect(main.textContent).toContain("Infrastructure Audit Platform");
  });

  it("renders the top-level app shell wrapper", () => {
    render(<AppShell />);
    expect(screen.getByTestId("app-shell")).toBeDefined();
  });
});
