import apiClient from "../../../shared/api/client";
import type { components } from "../../../shared/api/v1-contract";

type AdminUserDto = components["schemas"]["IdentityAdminUserDto"];
export type CreateAdminUser = components["schemas"]["CreateIdentityAdminUserDto"];
export interface AdminUser extends Omit<AdminUserDto, "workspaceCount"> { workspaceCount: number; }

export function mapAdminUser(dto: AdminUserDto): AdminUser {
  const workspaceCount = Number(dto.workspaceCount);
  if (!Number.isSafeInteger(workspaceCount) || workspaceCount < 0) {
    throw new Error("Invalid admin user workspace count received from the API.");
  }
  return { ...dto, workspaceCount };
}
export const adminUsersApi = {
  list: async (search: string, first: number, max: number) => (await apiClient.get<AdminUserDto[]>("/api/v1/admin/users", { params: { search: search || undefined, first, max }, skipWorkspaceHeader: true })).data.map(mapAdminUser),
  setStatus: async (id: string, enabled: boolean) => { await apiClient.put(`/api/v1/admin/users/${encodeURIComponent(id)}/status`, { enabled }, { skipWorkspaceHeader: true }); },
  create: async (body: CreateAdminUser) => { await apiClient.post("/api/v1/admin/users", body, { skipWorkspaceHeader: true }); },
  setSystemAdmin: async (id: string, systemAdmin: boolean) => { await apiClient.put(`/api/v1/admin/users/${encodeURIComponent(id)}/roles`, { systemAdmin }, { skipWorkspaceHeader: true }); },
};
