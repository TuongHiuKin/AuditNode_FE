import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useServers } from "../hooks/queries/useServers";
import apiClient from "../shared/api/client";
import { CatalogAccessProvider } from "../shared/catalog/CatalogAccessContext";
import type { CatalogView } from "../shared/catalog/types";

vi.mock("../shared/api/client", () => ({
  default: { get: vi.fn() },
}));

describe("catalog query isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], nextCursor: null, hasNextPage: false },
    });
  });

  it("loads Mine through the global catalog contract", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useServers(), { wrapper: wrapper(queryClient, "mine") });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/servers", expect.objectContaining({
      params: expect.objectContaining({ view: "mine" }),
      catalogRequest: true,
    }));
    expect(queryClient.getQueryCache().find({
      queryKey: ["catalog", "anonymous", "servers", "mine", "all-owners", "all-label-keys", "all-label-values"],
    })).toBeDefined();
  });

  it("keeps Shared in a separate cache key", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useServers(), { wrapper: wrapper(queryClient, "shared") });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(queryClient.getQueryCache().find({
      queryKey: ["catalog", "anonymous", "servers", "shared", "all-owners", "all-label-keys", "all-label-values"],
    })).toBeDefined();
    expect(queryClient.getQueryCache().find({
      queryKey: ["catalog", "anonymous", "servers", "mine", "all-owners", "all-label-keys", "all-label-values"],
    })).toBeUndefined();
  });
});

function wrapper(queryClient: QueryClient, initialView: CatalogView) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <CatalogAccessProvider initialView={initialView}>{children}</CatalogAccessProvider>
    </QueryClientProvider>
  );
}
