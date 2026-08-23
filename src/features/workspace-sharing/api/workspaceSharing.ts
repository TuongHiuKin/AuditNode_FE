import apiClient from "../../../shared/api/client";
export type ShareRole = "admin" | "auditor" | "viewer";
export type ShareScopeMode = "all" | "labels" | "frames";
export interface WorkspaceShare { userId: string; role: ShareRole; scopeMode: ShareScopeMode; targetIds: string[]; version: number; }
export interface UpsertWorkspaceShare { userId: string; role: ShareRole; scopeMode: ShareScopeMode; targetIds: string[]; version?: number; }
export interface WorkspaceShareOptions { users: Array<{ id: string; username: string; email?: string | null }>; labels: Array<{ id: string; displayName: string }>; frames: Array<{ id: string; displayName: string }>; }
export const workspaceSharingApi = {
  list: async (id: string) => (await apiClient.get<WorkspaceShare[]>(`/api/v1/workspaces/${id}/shares`)).data,
  grant: async (id: string, body: UpsertWorkspaceShare) => (await apiClient.post<WorkspaceShare>(`/api/v1/workspaces/${id}/shares`, body)).data,
  update: async (id: string, body: UpsertWorkspaceShare) => (await apiClient.put<WorkspaceShare>(`/api/v1/workspaces/${id}/shares/${encodeURIComponent(body.userId)}`, body)).data,
  revoke: async (id: string, userId: string, version: number) => { await apiClient.delete(`/api/v1/workspaces/${id}/shares/${encodeURIComponent(userId)}`, { params: { version } }); },
  options: async (id: string, search: string) => (await apiClient.get<WorkspaceShareOptions>(`/api/v1/workspaces/${id}/share-options`, { params: { search: search || undefined, first: 0, max: 20 } })).data,
};
