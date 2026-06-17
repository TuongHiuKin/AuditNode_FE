import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { paths } from "./v1-contract";
import { getToken, updateToken } from "../../services/keycloakService";

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
 * Request interceptor handler to inject the Keycloak Bearer Token.
 * Includes automatic token refresh logic.
 */
export const requestInterceptorHandler = async (config: InternalAxiosRequestConfig) => {
  let workspaceId = null;

  // 1. Inject Workspace Context dynamically from localStorage
  // Reading directly from localStorage breaks circular dependencies with Zustand/React Context
  try {
    const savedWorkspaceRaw = localStorage.getItem('auditNode_activeWorkspace');
    if (savedWorkspaceRaw) {
      const workspace = JSON.parse(savedWorkspaceRaw);
      workspaceId = workspace?.id;
    }

    if (workspaceId && config.headers) {
      // Axios 1.x compatibility
      if (typeof config.headers.set === 'function') {
        config.headers.set('X-Workspace-Id', workspaceId);
      } else {
        config.headers['X-Workspace-Id'] = workspaceId;
      }
    }
  } catch (e) {
    console.error("Failed to parse active workspace from localStorage", e);
  }

  // 2. Ensure Keycloak token is valid for at least 30 seconds
  try {
    await updateToken(30);
    const token = getToken();
    if (token && config.headers) {
      if (typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (error) {
    console.error("Failed to refresh Keycloak token in interceptor", error);
  }

  console.log("[Axios Outbound]", {
    url: config.url,
    method: config.method,
    hasAuthHeader: !!(config.headers && (config.headers['Authorization'] || (typeof config.headers.get === 'function' && config.headers.get('Authorization')))),
    workspaceHeaderValue: workspaceId || "MISSING"
  });

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
