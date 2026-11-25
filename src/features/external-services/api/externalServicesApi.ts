import apiClient from "@/shared/api/client";
import { API_ENDPOINTS } from "@/config/endpoints";

/** A third-party service the catalog depends on but does not own. */
export interface ExternalService {
  id: string;
  name: string;
  kind: string;
  endpoint: string | null;
  provider: string | null;
  protocol: string | null;
  port: number | null;
  environment: string;
  notes: string | null;
  ownerUserId: string;
  dependentApplicationCount: number;
}

export interface ExternalServiceInput {
  name: string;
  kind: string;
  environment: string;
  endpoint?: string | null;
  provider?: string | null;
  protocol?: string | null;
  port?: number | null;
  notes?: string | null;
}

/** Suggested values for the `kind` field; free text is still accepted. */
export const EXTERNAL_SERVICE_KINDS = [
  "SaaS",
  "REST API",
  "SOAP API",
  "Database",
  "SMTP",
  "Message broker",
  "File transfer",
  "Other",
] as const;

export async function fetchExternalServices(search?: string): Promise<ExternalService[]> {
  const response = await apiClient.get<ExternalService[]>(API_ENDPOINTS.EXTERNAL_SERVICES.BASE, {
    params: search ? { search } : undefined,
  });
  return response.data;
}

export async function createExternalService(input: ExternalServiceInput): Promise<ExternalService> {
  const response = await apiClient.post<ExternalService>(API_ENDPOINTS.EXTERNAL_SERVICES.BASE, input);
  return response.data;
}

export async function updateExternalService(id: string, input: Partial<ExternalServiceInput>): Promise<void> {
  await apiClient.put(API_ENDPOINTS.EXTERNAL_SERVICES.BY_ID(id), input);
}

export async function deleteExternalService(id: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.EXTERNAL_SERVICES.BY_ID(id));
}
