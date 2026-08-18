import { API_ENDPOINTS } from "../config/endpoints";
import apiClient from "../shared/api/client";
import type {
  ApplicationFilters,
  ApplicationResponse,
  CreateApplicationRequest,
  MigrateApplicationRequest,
  UpdateApplicationRequest,
} from "../shared/api/applicationTypes";
import { isNonEmptyIdentifier } from "../shared/api/applicationTypes";

export const ApplicationService = {
  async getApplications(filters: ApplicationFilters = {}): Promise<ApplicationResponse[]> {
    const params = compactFilters(filters);
    const response = await apiClient.get(API_ENDPOINTS.APPLICATIONS.BASE, { params });
    return unwrapList<ApplicationResponse>(response.data);
  },

  async getApplication(applicationId: string): Promise<ApplicationResponse> {
    requireIdentifier(applicationId, "application");
    const response = await apiClient.get(API_ENDPOINTS.APPLICATIONS.BY_ID(applicationId));
    return unwrapObject<ApplicationResponse>(response.data);
  },

  async createApplication(payload: CreateApplicationRequest): Promise<void> {
    if (payload.deployment) {
      requireIdentifier(payload.deployment.serverId, "deployment server");
    }
    await apiClient.post(API_ENDPOINTS.APPLICATIONS.BASE, payload);
  },

  async updateApplication(applicationId: string, payload: UpdateApplicationRequest): Promise<void> {
    requireIdentifier(applicationId, "application");
    const hasDeploymentChange = payload.portMappingId !== undefined
      || payload.serverId !== undefined
      || payload.portNumber !== undefined;
    if (hasDeploymentChange) {
      requireIdentifier(payload.portMappingId, "deployment");
      requireIdentifier(payload.serverId, "deployment server");
      if (!payload.portNumber || payload.portNumber < 1 || payload.portNumber > 65535) {
        throw new Error("A valid deployment port is required.");
      }
    }
    await apiClient.put(API_ENDPOINTS.APPLICATIONS.BY_ID(applicationId), payload);
  },

  async migrateDeployment(payload: MigrateApplicationRequest): Promise<void> {
    requireIdentifier(payload.portMappingId, "deployment");
    requireIdentifier(payload.serverId, "deployment server");
    if (payload.portNumber < 1 || payload.portNumber > 65535) {
      throw new Error("A valid deployment port is required.");
    }
    await apiClient.put(API_ENDPOINTS.APPLICATIONS.MIGRATE, payload);
  },
};

function requireIdentifier(value: string | null | undefined, subject: string): asserts value is string {
  if (!isNonEmptyIdentifier(value)) throw new Error(`A non-empty ${subject} identifier is required.`);
}

function compactFilters(filters: ApplicationFilters): ApplicationFilters {
  return {
    ...(filters.labelKey?.trim() ? { labelKey: filters.labelKey.trim() } : {}),
    ...(filters.labelValue?.trim() ? { labelValue: filters.labelValue.trim() } : {}),
  };
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (isRecord(payload) && Array.isArray(payload.data)) return payload.data as T[];
  return [];
}

function unwrapObject<T>(payload: unknown): T {
  const value = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  return value as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
