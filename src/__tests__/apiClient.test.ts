import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestInterceptorHandler, responseInterceptorErrorHandler } from "../shared/api/client";

describe("apiClient Interceptors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requestInterceptorHandler", () => {
    it("adds Bearer token from localStorage if present", async () => {
      const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockReturnValue("test-token");
      
      const config = { headers: {} } as any;
      const result = await requestInterceptorHandler(config);
      
      expect(result.headers.Authorization).toBe("Bearer test-token");
      getItemSpy.mockRestore();
    });

    it("does not add Authorization header if token is missing", async () => {
      const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
      
      const config = { headers: {} } as any;
      const result = await requestInterceptorHandler(config);
      
      expect(result.headers.Authorization).toBeUndefined();
      getItemSpy.mockRestore();
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
