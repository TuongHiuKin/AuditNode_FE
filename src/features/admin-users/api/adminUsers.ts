import apiClient from "../../../shared/api/client";
export interface AdminUser { id: string; username: string; email?: string | null; enabled: boolean; workspaceCount: number; isSystemAdmin: boolean; }
export interface CreateAdminUser { username: string; email: string; password: string; }
export const adminUsersApi = {
  list: async (search: string, first: number, max: number) => (await apiClient.get<AdminUser[]>("/api/v1/admin/users", { params: { search: search || undefined, first, max }, skipWorkspaceHeader: true })).data,
  setStatus: async (id: string, enabled: boolean) => { await apiClient.put(`/api/v1/admin/users/${encodeURIComponent(id)}/status`, { enabled }, { skipWorkspaceHeader: true }); },
  create: async (body: CreateAdminUser) => { await apiClient.post("/api/v1/admin/users", body, { skipWorkspaceHeader: true }); },
  setSystemAdmin: async (id: string, systemAdmin: boolean) => { await apiClient.put(`/api/v1/admin/users/${encodeURIComponent(id)}/roles`, { systemAdmin }, { skipWorkspaceHeader: true }); },
};
