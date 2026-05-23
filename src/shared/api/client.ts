import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { paths } from "./v1-contract";

/**
 * Base URL for the API.
 * Defaults to localhost:7126 as per requirement.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://localhost:7126";

/**
 * Placeholder for Keycloak token retrieval.
 * In a real scenario, this would interface with the Keycloak provider.
 */
const getToken = (): string | null => {
  // Logic to fetch token from Keycloak instance/context
  // return window.keycloak?.token;
  return localStorage.getItem("keycloak_token"); // Example placeholder
};

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
 * Request interceptor to inject the Keycloak Bearer Token.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for centralized error handling.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || "An unexpected error occurred";
    console.error("[API Error]", message);
    return Promise.reject(error);
  }
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
