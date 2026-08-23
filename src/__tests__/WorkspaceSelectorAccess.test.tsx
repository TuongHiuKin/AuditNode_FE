import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceSelector } from "../shared/workspace/WorkspaceSelector";
vi.mock("../shared/workspace/WorkspaceContext", () => ({ useWorkspace: () => ({
  status: "ready", selectedWorkspaceId: "mine", selectWorkspace: vi.fn(), retry: vi.fn(),
  workspaces: [
    { id: "mine", name: "Personal", relationship: "owner", effectiveRole: "owner" },
    { id: "shared", name: "Payments", relationship: "shared", effectiveRole: "viewer" },
  ],
}) }));
describe("WorkspaceSelector access grouping", () => {
  it("separates owned and shared workspaces and displays effective roles", () => {
    render(<WorkspaceSelector />);
    expect(screen.getByRole("group", { name: "My Workspaces" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Shared with Me" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Payments.*viewer/ })).toBeInTheDocument();
  });
});
