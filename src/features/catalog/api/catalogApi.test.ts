import { describe, expect, it, vi } from "vitest";
import apiClient from "../../../shared/api/client";
import { fetchCatalogPage } from "./catalogApi";

describe("catalogApi", () => {
  it("sends the opaque cursor and marks catalog reads for shared-cache invalidation", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({
      data: { items: [], nextCursor: null, hasNextPage: false },
    });

    await fetchCatalogPage("applications", {
      view: "shared", cursor: "opaque", limit: 25,
      ownerUserId: "owner-a",
      labelKey: "team", labelValue: "payments",
    });

    expect(get).toHaveBeenCalledWith("/api/v1/applications", expect.objectContaining({
      catalogRequest: true,
      params: expect.objectContaining({ view: "shared", cursor: "opaque", ownerUserId: "owner-a", labelKey: "team", labelValue: "payments" }),
    }));
  });

  it.each(["servers", "labels"] as const)("sends owner and label filters for %s", async (resource) => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({
      data: { items: [], nextCursor: null, hasNextPage: false },
    });

    await fetchCatalogPage(resource, {
      view: "shared", ownerUserId: "owner-b", labelKey: "env", labelValue: "prod",
    });

    expect(get).toHaveBeenCalledWith(`/api/v1/${resource}`, expect.objectContaining({
      params: expect.objectContaining({ ownerUserId: "owner-b", labelKey: "env", labelValue: "prod" }),
    }));
  });
});
