import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogAccessProvider } from "../../../shared/catalog/CatalogAccessContext";
import { invalidateSharedCatalog } from "../../../shared/catalog/catalogCache";
import { fetchCatalogPage } from "./catalogApi";
import { useCatalogPages } from "./useCatalogPages";

vi.mock("./catalogApi", () => ({ fetchCatalogPage: vi.fn() }));

describe("useCatalogPages shared-cache security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchCatalogPage).mockResolvedValue({ items: [], nextCursor: null, hasNextPage: false });
  });

  it("removes retained Shared pages when access is invalidated", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <CatalogAccessProvider principalId="viewer" initialView="shared">
          {children}
        </CatalogAccessProvider>
      </QueryClientProvider>
    );
    const { result, unmount } = renderHook(() => useCatalogPages("servers"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueriesData({ queryKey: ["catalog", "viewer", "servers", "shared"] })).not.toHaveLength(0);

    act(() => invalidateSharedCatalog());

    await waitFor(() => expect(client.getQueriesData({ queryKey: ["catalog", "viewer", "servers", "shared"] })).toHaveLength(0));
    unmount();
  });
});
