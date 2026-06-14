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
  try {
    // Ensure token is valid for at least 30 seconds
    await updateToken(30);
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Failed to refresh token", error);
  }
  return config;
};

apiClient.interceptors.request.use(requestInterceptorHandler, (error) => {
  return Promise.reject(error);
});

/**
 * Response interceptor for centralized error handling.
 */
export const responseInterceptorErrorHandler = (error: any) => {
  const message = error.response?.data?.message || error.message || "An unexpected error occurred";
  console.error("[API Error]", message);
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
