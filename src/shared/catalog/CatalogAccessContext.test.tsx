import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CatalogAccessProvider, catalogQueryKey, useCatalogAccess } from "./CatalogAccessContext";

describe("CatalogAccessProvider", () => {
  it("defaults to Mine and does not enable Shared until selected", () => {
    const { result } = renderHook(() => useCatalogAccess(), { wrapper: CatalogAccessProvider });

    expect(result.current.view).toBe("mine");
    expect(result.current.sharedEnabled).toBe(false);

    act(() => result.current.selectView("shared"));

    expect(result.current.view).toBe("shared");
    expect(result.current.sharedEnabled).toBe(true);
  });

  it("uses distinct cache keys for Mine and Shared filters", () => {
    expect(catalogQueryKey("servers", "user-a", "mine", { ownerUserId: null, labelKey: null, labelValue: null }))
      .not.toEqual(catalogQueryKey("servers", "user-a", "shared", { ownerUserId: null, labelKey: null, labelValue: null }));
    expect(catalogQueryKey("servers", "user-a", "mine", { ownerUserId: null, labelKey: null, labelValue: null }))
      .not.toEqual(catalogQueryKey("servers", "user-b", "mine", { ownerUserId: null, labelKey: null, labelValue: null }));
  });
});
