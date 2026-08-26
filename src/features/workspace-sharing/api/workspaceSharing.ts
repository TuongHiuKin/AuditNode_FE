import apiClient from "../../../shared/api/client";
import type { components } from "../../../shared/api/v1-contract";
export type ShareRole = "workspace_admin" | "auditor" | "viewer";
export type ShareScopeMode = "all" | "labels" | "frames";
export interface WorkspaceShare { userId: string; role: ShareRole; scopeMode: ShareScopeMode; targetIds: string[]; version: number; }
type WorkspaceShareDto = components["schemas"]["WorkspaceShareDto"];
type WorkspaceShareOptionsDto = components["schemas"]["WorkspaceShareOptionsDto"];
type UpsertWorkspaceShareDto = components["schemas"]["UpsertWorkspaceShareDto"];
export interface UpsertWorkspaceShare extends Omit<UpsertWorkspaceShareDto, "role" | "scopeMode" | "version"> { role: ShareRole; scopeMode: ShareScopeMode; version?: number; }
export type WorkspaceShareOptions = WorkspaceShareOptionsDto;

const shareRoles: readonly ShareRole[] = ["workspace_admin", "auditor", "viewer"];
const scopeModes: readonly ShareScopeMode[] = ["all", "labels", "frames"];

export function mapWorkspaceShare(dto: WorkspaceShareDto): WorkspaceShare {
  if (!shareRoles.includes(dto.role as ShareRole)) throw new Error("Invalid workspace share role received from the API.");
  if (!scopeModes.includes(dto.scopeMode as ShareScopeMode)) throw new Error("Invalid workspace share scope received from the API.");
  const version = Number(dto.version);
  if (!Number.isSafeInteger(version) || version < 0) throw new Error("Invalid workspace share version received from the API.");
  return { ...dto, role: dto.role as ShareRole, scopeMode: dto.scopeMode as ShareScopeMode, version };
}
function toUpsertDto(body: UpsertWorkspaceShare): UpsertWorkspaceShareDto {
  return { ...body, version: body.version ?? 0 };
}
export const workspaceSharingApi = {
  list: async (id: string) => (await apiClient.get<WorkspaceShareDto[]>(`/api/v1/workspaces/${id}/shares`)).data.map(mapWorkspaceShare),
  grant: async (id: string, body: UpsertWorkspaceShare) => mapWorkspaceShare((await apiClient.post<WorkspaceShareDto>(`/api/v1/workspaces/${id}/shares`, toUpsertDto(body))).data),
  update: async (id: string, body: UpsertWorkspaceShare) => mapWorkspaceShare((await apiClient.put<WorkspaceShareDto>(`/api/v1/workspaces/${id}/shares/${encodeURIComponent(body.userId)}`, toUpsertDto(body))).data),
  revoke: async (id: string, userId: string, version: number) => { await apiClient.delete(`/api/v1/workspaces/${id}/shares/${encodeURIComponent(userId)}`, { params: { version } }); },
  options: async (id: string, search: string, signal?: AbortSignal) => (await apiClient.get<WorkspaceShareOptions>(`/api/v1/workspaces/${id}/share-options`, { params: { search: search || undefined, first: 0, max: 20 }, signal })).data,
};
