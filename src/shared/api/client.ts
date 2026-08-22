import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";
import { clearClientSession, getAccessToken, setAccessToken } from "../auth/authStore";
import { getSelectedWorkspaceId } from "../workspace/workspaceStore";
import { paths } from "./v1-contract";

declare module "axios" {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
    skipWorkspaceHeader?: boolean;
  }

  interface InternalAxiosRequestConfig {
    skipAuthRefresh?: boolean;
    _authRetry?: boolean;
  }
}

interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

interface ErrorResponse {
  error?: string;
  message?: string;
  errors?: unknown;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://localhost:7126";
const AUTH_REFRESH_EXCLUSIONS = new Set([
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
]);

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

let refreshInFlight: Promise<string> | null = null;

export const requestInterceptorHandler = async (config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  const workspaceId = getSelectedWorkspaceId();

  config.headers ??= new AxiosHeaders();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  if (workspaceId && !config.skipWorkspaceHeader) config.headers.set("X-Workspace-Id", workspaceId);

  if (config.data instanceof FormData) config.headers.delete("Content-Type");
  return config;
};

apiClient.interceptors.request.use(requestInterceptorHandler, (error: unknown) => Promise.reject(error));

export const responseInterceptorErrorHandler = async (error: unknown) => {
  if (!axios.isAxiosError<ErrorResponse>(error)) return Promise.reject(error);

  const status = error.response?.status;
  const config = error.config;
  const url = config?.url ?? "";
  const safeMessage = error.response?.data?.message ?? error.response?.data?.error ?? error.message;
  console.error(`[API Error] ${status ?? "Network Error"} | ${url || "Unknown URL"} | ${safeMessage || "Request failed"}`);

  if (status === 403) {
    toast.error("Bạn không có quyền thực hiện thao tác này.");
  }

  if (status !== 401 || !config || config.skipAuthRefresh || isRefreshExcluded(url)) {
    return Promise.reject(error);
  }

  if (config._authRetry) {
    clearClientSession();
    return Promise.reject(error);
  }

  config._authRetry = true;
  try {
    const token = await refreshAccessToken();
    config.headers ??= new AxiosHeaders();
    config.headers.set("Authorization", `Bearer ${token}`);
    return apiClient.request(config);
  } catch {
    clearClientSession();
    return Promise.reject(error);
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  responseInterceptorErrorHandler,
);

function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = apiClient
      .post<RefreshResponse>(
        "/api/v1/auth/refresh",
        undefined,
        { withCredentials: true, skipAuthRefresh: true },
      )
      .then((response) => {
        setAccessToken(response.data.accessToken);
        return response.data.accessToken;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

function isRefreshExcluded(url: string) {
  const path = url.split("?")[0];
  return AUTH_REFRESH_EXCLUSIONS.has(path);
}

export default apiClient;
export type ApiPaths = paths;
export type Schemas = import("./v1-contract").components["schemas"];
