import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "../../shared/api/client";
import { PublicSharePage } from "./PublicSharePage";

describe("PublicSharePage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, "", "/shared#token=viewer-secret");
  });

  it("removes the fragment after capture and sends the token only in a POST body", async () => {
    const post = vi.spyOn(apiClient, "post").mockImplementation(async (url) => {
      if (url === "/api/v1/share-links/resolve") {
        return { data: { labelId: "label-1", ownerUserId: "owner-1", permission: "viewer" } } as never;
      }

      return { data: { items: [], nextCursor: null, hasNextPage: false } } as never;
    });

    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PublicSharePage />
    </QueryClientProvider>);

    await waitFor(() => expect(post).toHaveBeenCalledTimes(3));
    expect(window.location.hash).toBe("");
    expect(localStorage.getItem("auditnode.shareToken")).toBeNull();
    expect(post.mock.calls[0][0]).toBe("/api/v1/share-links/resolve");
    expect(post.mock.calls[0][1]).toEqual({ token: "viewer-secret" });
    expect(await screen.findByText(/Shared catalog/i)).toBeInTheDocument();
  });
});
