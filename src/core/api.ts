export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Centralized fetch wrapper to handle base URL and common headers.
 */
export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
