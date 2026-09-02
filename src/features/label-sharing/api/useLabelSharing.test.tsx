import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { AxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { responseInterceptorErrorHandler } from "../../../shared/api/client";
import { registerSharedCatalogInvalidator } from "../../../shared/catalog/catalogCache";
import * as sharingApi from "./labelSharing";
import { useLabelSharingMutations } from "./useLabelSharing";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("label-sharing cache invalidation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("invalidates label-sharing queries and the Shared catalog after a grant revoke", async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidateQueries = vi.spyOn(client, "invalidateQueries").mockResolvedValue(undefined);
    vi.spyOn(sharingApi, "revokeUserGrant").mockResolvedValue(undefined);
    const sharedInvalidator = vi.fn();
    const unregister = registerSharedCatalogInvalidator(sharedInvalidator);
    const { result } = renderHook(() => useLabelSharingMutations("label-1"), {
      wrapper: createWrapper(client),
    });

    try {
      await act(async () => {
        await result.current.revokeGrant.mutateAsync({ id: "grant-1", version: 5 });
      });

      expect(sharingApi.revokeUserGrant).toHaveBeenCalledWith("label-1", "grant-1", 5);
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["label-sharing", "label-1"] });
      expect(sharedInvalidator).toHaveBeenCalledTimes(1);
    } finally {
      unregister();
      client.clear();
    }
  });

  it("invalidates the Shared catalog when an authorized shared request starts returning 403", async () => {
    const sharedInvalidator = vi.fn();
    const unregister = registerSharedCatalogInvalidator(sharedInvalidator);
    const error = {
      isAxiosError: true,
      message: "Request failed with status code 403",
      config: {
        url: "/api/v1/servers?view=shared",
        catalogRequest: true,
        catalogView: "shared",
      } as AxiosRequestConfig,
      response: {
        status: 403,
        data: { message: "Grant revoked" },
      },
    };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      await expect(responseInterceptorErrorHandler(error)).rejects.toBe(error);
      expect(sharedInvalidator).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("403"));
    } finally {
      unregister();
    }
  });
});
