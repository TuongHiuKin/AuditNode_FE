import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { paths } from "./v1-contract";

/**
 * Base URL for the API.
 * Defaults to localhost:7126 as per requirement.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://localhost:7126";

/**
 * Centralized Axios instance with type safety and interceptors.
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor handler to inject the JWT Bearer Token.
 */
export const requestInterceptorHandler = async (config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("accessToken");
  const workspaceId = localStorage.getItem("workspaceId") || "00000000-0000-0000-0000-000000000000";

  if (config.headers) {
    if (token) {
      if (typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    if (workspaceId) {
      if (typeof config.headers.set === 'function') {
        config.headers.set('X-Workspace-Id', workspaceId);
      } else {
        config.headers['X-Workspace-Id'] = workspaceId;
      }
    }
  }

  // CRITICAL FIX: Gỡ bỏ ép buộc JSON nếu payload là FormData
  if (config.data instanceof FormData && config.headers) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
    } else {
      delete config.headers['Content-Type'];
    }
  }

  return config;
};

apiClient.interceptors.request.use(requestInterceptorHandler, (error) => {
  return Promise.reject(error);
});

/**
 * Response interceptor for centralized error handling and enhanced debugging.
 */
export const responseInterceptorErrorHandler = (error: any) => {
  const { response, config } = error;
  const status = response?.status;
  const url = config?.url;
  const message = response?.data?.message || error.message || "An unexpected error occurred";

  console.error(`[API Error] ${status || "Network Error"} | ${url || "Unknown URL"} | ${message}`);
  
  if (response?.data?.errors) {
    console.error("[Validation Errors]", response.data.errors);
  }

  // Handle 403 Forbidden globally
  if (status === 403) {
    toast.error("Bạn không có quyền thực hiện thao tác này.");
  }

  // Handle 401 Unauthorized globally
  if (status === 401) {
    localStorage.removeItem("accessToken");
    // Only redirect if we are not already on the login page
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  return Promise.reject(error);
};

apiClient.interceptors.response.use(
  (response) => response,
  responseInterceptorErrorHandler
);

export default apiClient;

/**
 * Type-safe API methods mapping.
 */
export type ApiPaths = paths;

/**
 * Utility to extract component schemas.
 */
export type Schemas = import("./v1-contract").components["schemas"];
