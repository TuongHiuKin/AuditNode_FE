import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "../shared/api/client";
import { WorkspaceProvider, useWorkspace } from "../shared/workspace/WorkspaceContext";
import { clearWorkspaceSelection, getSelectedWorkspaceId } from "../shared/workspace/workspaceStore";

vi.mock("../shared/api/client", () => ({ default: { get: vi.fn() } }));
vi.mock("../shared/auth/AuthContext", () => ({
  useAuth: () => ({ status: "authenticated", user: { id: "user-id", username: "user", roles: [] } }),
}));

const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";

function Probe() {
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  return (
    <div>
      <span data-testid="workspace-status">{workspace.status}</span>
      <span data-testid="selected-workspace">{workspace.selectedWorkspaceId ?? "none"}</span>
      <button onClick={() => {
        queryClient.setQueryData(["servers", firstId], ["old-data"]);
        workspace.selectWorkspace(secondId);
      }}>Select second</button>
    </div>
  );
}

describe("WorkspaceProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearWorkspaceSelection();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ id: firstId, name: "Primary" }, { id: secondId, name: "Secondary" }],
    });
  });

  it("loads accessible workspaces after authentication without a tenant header", async () => {
    const queryClient = createClient();
    renderProvider(queryClient);

    await waitFor(() => expect(screen.getByTestId("workspace-status")).toHaveTextContent("ready"));
    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/v1/workspaces",
      expect.objectContaining({ skipWorkspaceHeader: true }),
    );
    expect(screen.getByTestId("selected-workspace")).toHaveTextContent(firstId);
    expect(getSelectedWorkspaceId()).toBe(firstId);
  });

  it("restores only an accessible non-empty persisted workspace", async () => {
    localStorage.setItem("workspaceId", "00000000-0000-0000-0000-000000000000");
    const queryClient = createClient();
    renderProvider(queryClient);
    await waitFor(() => expect(screen.getByTestId("workspace-status")).toHaveTextContent("ready"));
    expect(getSelectedWorkspaceId()).toBe(firstId);
    expect(localStorage.getItem("workspaceId")).toBe(firstId);

    localStorage.setItem("workspaceId", secondId);
    clearWorkspaceSelection({ preservePersisted: true });
    renderProvider(createClient());
    await waitFor(() => expect(getSelectedWorkspaceId()).toBe(secondId));
  });

  it("switches workspace, persists it, and removes old tenant cache", async () => {
    const queryClient = createClient();
    renderProvider(queryClient);
    await waitFor(() => expect(screen.getByTestId("workspace-status")).toHaveTextContent("ready"));

    await userEvent.click(screen.getByRole("button", { name: "Select second" }));

    expect(getSelectedWorkspaceId()).toBe(secondId);
    expect(localStorage.getItem("workspaceId")).toBe(secondId);
    expect(queryClient.getQueryData(["servers", firstId])).toBeUndefined();
  });
});

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderProvider(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider><Probe /></WorkspaceProvider>
    </QueryClientProvider>,
  );
}
