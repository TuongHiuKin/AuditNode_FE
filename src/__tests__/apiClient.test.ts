import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient, { requestInterceptorHandler, responseInterceptorErrorHandler } from "../shared/api/client";
import {
  beginAuthInitialization,
  clearClientSession,
  registerSessionCacheClearer,
  setAuthenticatedSession,
} from "../shared/auth/authStore";
import { clearWorkspaceSelection, setSelectedWorkspaceId } from "../shared/workspace/workspaceStore";

describe("apiClient auth interceptors", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    beginAuthInitialization();
    clearClientSession();
    clearWorkspaceSelection();
  });

  it("adds the Bearer token from memory and ignores legacy browser token storage", async () => {
    localStorage.setItem("accessToken", "legacy-token");
    setAuthenticatedSession("memory-token", { id: "id", username: "user", roles: [] });
    const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;

    const result = await requestInterceptorHandler(config);

    expect(result.headers.get("Authorization")).toBe("Bearer memory-token");
    expect(result.headers.get("Authorization")).not.toContain("legacy-token");
  });

  it("adds a workspace header only for a valid selected workspace", async () => {
    const withoutSelection = await requestInterceptorHandler({ headers: new AxiosHeaders() } as InternalAxiosRequestConfig);
    expect(withoutSelection.headers.get("X-Workspace-Id")).toBeFalsy();

    setSelectedWorkspaceId("11111111-1111-4111-8111-111111111111");
    const withSelection = await requestInterceptorHandler({ headers: new AxiosHeaders() } as InternalAxiosRequestConfig);
    expect(withSelection.headers.get("X-Workspace-Id")).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("uses one refresh for concurrent 401 responses and retries each request once", async () => {
    setAuthenticatedSession("expired-token", { id: "id", username: "user", roles: [] });
    const refresh = vi.spyOn(apiClient, "post").mockResolvedValue({
      data: { accessToken: "rotated-token", expiresIn: 300 },
    });
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({
      data: { ok: true }, status: 200, statusText: "OK", headers: {}, config,
    }));
    apiClient.defaults.adapter = adapter;

    const first = unauthorized("/api/v1/servers");
    const second = unauthorized("/api/v1/applications");
    await Promise.all([
      responseInterceptorErrorHandler(first),
      responseInterceptorErrorHandler(second),
    ]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it("does not recursively refresh authentication endpoints", async () => {
    const refresh = vi.spyOn(apiClient, "post");
    const error = unauthorized("/api/v1/auth/login");

    await expect(responseInterceptorErrorHandler(error)).rejects.toBe(error);

    expect(refresh).not.toHaveBeenCalled();
  });

  it("clears auth, workspace, graph session, and query cache after terminal refresh failure", async () => {
    setAuthenticatedSession("expired-token", { id: "id", username: "user", roles: [] });
    localStorage.setItem("workspaceId", "workspace-id");
    sessionStorage.setItem("dependencyGraphState", "cached-graph");
    const clearCache = vi.fn();
    registerSessionCacheClearer(clearCache);
    vi.spyOn(apiClient, "post").mockRejectedValue(new Error("refresh failed"));

    const error = unauthorized("/api/v1/servers");
    await expect(responseInterceptorErrorHandler(error)).rejects.toBe(error);

    expect(localStorage.getItem("workspaceId")).toBeNull();
    expect(sessionStorage.getItem("dependencyGraphState")).toBeNull();
    expect(clearCache).toHaveBeenCalledTimes(1);
  });
});

function unauthorized(url: string) {
  const config = { url, headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError(
    "Unauthorized",
    "ERR_BAD_REQUEST",
    config,
    undefined,
    { data: {}, status: 401, statusText: "Unauthorized", headers: {}, config },
  );
}
