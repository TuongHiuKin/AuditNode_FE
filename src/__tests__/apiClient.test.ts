import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestInterceptorHandler, responseInterceptorErrorHandler } from "../shared/api/client";
import * as keycloakService from "../services/keycloakService";

vi.mock("../services/keycloakService", () => ({
  getToken: vi.fn(),
  updateToken: vi.fn().mockResolvedValue(true),
}));

describe("apiClient Interceptors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requestInterceptorHandler", () => {
    it("adds Bearer token from keycloakService if present", async () => {
      vi.mocked(keycloakService.getToken).mockReturnValue("test-token");
      
      const config = { headers: {} } as any;
      const result = await requestInterceptorHandler(config);
      
      expect(keycloakService.updateToken).toHaveBeenCalledWith(30);
      expect(result.headers.Authorization).toBe("Bearer test-token");
    });

    it("does not add Authorization header if token is missing", async () => {
      vi.mocked(keycloakService.getToken).mockReturnValue(undefined);
      
      const config = { headers: {} } as any;
      const result = await requestInterceptorHandler(config);
      
      expect(result.headers.Authorization).toBeUndefined();
    });

    it("handles token refresh failure gracefully", async () => {
      vi.mocked(keycloakService.updateToken).mockRejectedValue(new Error("Refresh failed"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      const config = { headers: {} } as any;
      const result = await requestInterceptorHandler(config);
      
      expect(consoleSpy).toHaveBeenCalledWith("Failed to refresh Keycloak token in interceptor", expect.any(Error));
      expect(result.headers.Authorization).toBeUndefined();
      
      consoleSpy.mockRestore();
    });
  });

  describe("responseInterceptorErrorHandler", () => {
    it("logs error and rejects with response message", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = {
        response: {
          data: { message: "API Error Message" }
        },
        message: "Network Error",
        config: { url: "/test-url" }
      };

      await expect(responseInterceptorErrorHandler(error)).rejects.toEqual(error);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[API Error]"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("API Error Message"));
      
      consoleSpy.mockRestore();
    });

    it("uses default error message if response message is missing", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = {
        message: "Network Error"
      };

      await expect(responseInterceptorErrorHandler(error)).rejects.toEqual(error);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[API Error]"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Network Error"));
      
      consoleSpy.mockRestore();
    });
  });
});
