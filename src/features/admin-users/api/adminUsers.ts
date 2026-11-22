import apiClient from "../../../shared/api/client";
import type { components } from "../../../shared/api/v1-contract";

type AdminUserDto = components["schemas"]["IdentityAdminUserDto"];
export type CreateAdminUser = components["schemas"]["CreateIdentityAdminUserDto"];
export type AdminUser = AdminUserDto;

export function mapAdminUser(dto: AdminUserDto): AdminUser {
  return dto;
}
export const adminUsersApi = {
  list: async (search: string, first: number, max: number) => (await apiClient.get<AdminUserDto[]>("/api/v1/admin/users", { params: { search: search || undefined, first, max } })).data.map(mapAdminUser),
  setStatus: async (id: string, enabled: boolean) => { await apiClient.put(`/api/v1/admin/users/${encodeURIComponent(id)}/status`, { enabled }); },
  create: async (body: CreateAdminUser) => { await apiClient.post("/api/v1/admin/users", body); },
  setSystemAdmin: async (id: string, systemAdmin: boolean) => { await apiClient.put(`/api/v1/admin/users/${encodeURIComponent(id)}/roles`, { systemAdmin }); },
};
