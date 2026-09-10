import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CatalogAccessProvider, catalogQueryKey, useCatalogAccess } from "./CatalogAccessContext";
import { registerSharedCatalogInvalidator } from "./catalogCache";

describe("CatalogAccessProvider", () => {
  it("defaults to Mine and does not enable Shared until selected", () => {
    let invalidations = 0;
    const unregister = registerSharedCatalogInvalidator(() => { invalidations += 1; });
    try {
      const { result } = renderHook(() => useCatalogAccess(), { wrapper: CatalogAccessProvider });

      expect(result.current.view).toBe("mine");
      expect(result.current.sharedEnabled).toBe(false);

      act(() => result.current.selectView("shared"));

      expect(result.current.view).toBe("shared");
      expect(result.current.sharedEnabled).toBe(true);
      expect(invalidations).toBe(1);
    } finally {
      unregister();
    }
  });

  it("uses distinct cache keys for Mine and Shared filters", () => {
    expect(catalogQueryKey("servers", "user-a", "mine", { ownerUserId: null, labelKey: null, labelValue: null }))
      .not.toEqual(catalogQueryKey("servers", "user-a", "shared", { ownerUserId: null, labelKey: null, labelValue: null }));
    expect(catalogQueryKey("servers", "user-a", "mine", { ownerUserId: null, labelKey: null, labelValue: null }))
      .not.toEqual(catalogQueryKey("servers", "user-b", "mine", { ownerUserId: null, labelKey: null, labelValue: null }));
  });
});
