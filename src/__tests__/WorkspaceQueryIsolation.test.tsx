import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useServers } from "../hooks/queries/useServers";
import { ServerService } from "../services/serverService";
import { clearWorkspaceSelection, setSelectedWorkspaceId } from "../shared/workspace/workspaceStore";

vi.mock("../services/serverService", () => ({
  ServerService: { getServers: vi.fn().mockResolvedValue([]) },
}));

const workspaceId = "11111111-1111-4111-8111-111111111111";

describe("tenant query isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearWorkspaceSelection();
  });

  it("does not fetch tenant data before a workspace is selected", () => {
    const queryClient = new QueryClient();
    renderHook(() => useServers(), { wrapper: wrapper(queryClient) });
    expect(ServerService.getServers).not.toHaveBeenCalled();
  });

  it("includes the selected workspace ID in the tenant query key", async () => {
    setSelectedWorkspaceId(workspaceId);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useServers(), { wrapper: wrapper(queryClient) });
    await waitFor(() => expect(ServerService.getServers).toHaveBeenCalled());
    expect(queryClient.getQueryCache().find({ queryKey: ["servers", workspaceId] })).toBeDefined();
  });
});

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
