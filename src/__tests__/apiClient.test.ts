import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestInterceptorHandler, responseInterceptorErrorHandler } from "../shared/api/client";

describe("apiClient Interceptors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("requestInterceptorHandler", () => {
    it("adds Bearer token from localStorage if present", () => {
      localStorage.setItem("keycloak_token", "test-token");
      
      const config = { headers: {} } as any;
      const result = requestInterceptorHandler(config);
      
      expect(result.headers.Authorization).toBe("Bearer test-token");
    });

    it("does not add Authorization header if token is missing", () => {
      const config = { headers: {} } as any;
      const result = requestInterceptorHandler(config);
      
      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe("responseInterceptorErrorHandler", () => {
    it("logs error and rejects with response message", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = {
        response: {
          data: { message: "API Error Message" }
        },
        message: "Network Error"
      };

      await expect(responseInterceptorErrorHandler(error)).rejects.toEqual(error);
      expect(consoleSpy).toHaveBeenCalledWith("[API Error]", "API Error Message");
      
      consoleSpy.mockRestore();
    });

    it("uses default error message if response message is missing", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = {
        message: "Network Error"
      };

      await expect(responseInterceptorErrorHandler(error)).rejects.toEqual(error);
      expect(consoleSpy).toHaveBeenCalledWith("[API Error]", "Network Error");
      
      consoleSpy.mockRestore();
    });
  });
});
