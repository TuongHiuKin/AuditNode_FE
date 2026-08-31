import apiClient from "../../../shared/api/client";

export type GrantPermission = "viewer" | "editor";
export interface LabelGrant {
  id: string;
  labelId: string;
  granteeUserId: string;
  permission: GrantPermission;
  expiresAt: string | null;
  revokedAt: string | null;
  version: number;
  sharesAllOwnerResources?: boolean;
  warningCode?: string | null;
}
export interface ShareOptionUser { id: string; username: string; email?: string | null; }
export interface ShareOptions { users: ShareOptionUser[]; sharesAllOwnerResources: boolean; warningCode?: string | null; }
export interface CreateGrantRequest { granteeUserId: string; permission: GrantPermission; expiresAt: string | null; }
export interface CreatedShareLink { grantId: string; token: string; expiresAt: string; version: number; sharesAllOwnerResources: boolean; warningCode?: string | null; }
export interface ShareLinkMetadata { grantId: string; labelId: string; expiresAt: string; revokedAt: string | null; version: number; sharesAllOwnerResources: boolean; warningCode?: string | null; }

const catalogConfig = { skipWorkspaceHeader: true, catalogRequest: true as const };

export async function listUserGrants(labelId: string) {
  return (await apiClient.get<LabelGrant[]>(`/api/v1/labels/${labelId}/grants`, catalogConfig)).data;
}
export async function searchShareUsers(labelId: string, search: string) {
  return (await apiClient.get<ShareOptions>(`/api/v1/labels/${labelId}/share-options`, {
    ...catalogConfig, params: { search: search.trim(), first: 0, max: 20 },
  })).data;
}
export async function createUserGrant(labelId: string, request: CreateGrantRequest) {
  return (await apiClient.post<LabelGrant>(`/api/v1/labels/${labelId}/grants`, request, catalogConfig)).data;
}
export async function updateUserGrant(labelId: string, grant: Pick<LabelGrant, "id" | "permission" | "expiresAt" | "version">) {
  return (await apiClient.put<LabelGrant>(`/api/v1/labels/${labelId}/grants/${grant.id}`, {
    permission: grant.permission, expiresAt: grant.expiresAt, version: grant.version,
  }, catalogConfig)).data;
}
export async function revokeUserGrant(labelId: string, grantId: string, version: number) {
  await apiClient.delete(`/api/v1/labels/${labelId}/grants/${grantId}`, { ...catalogConfig, params: { version } });
}
export async function createAnonymousViewerLink(labelId: string, expiresAt: string) {
  return (await apiClient.post<CreatedShareLink>(`/api/v1/labels/${labelId}/share-links`, { expiresAt }, catalogConfig)).data;
}
export async function listAnonymousViewerLinks(labelId: string) {
  return (await apiClient.get<ShareLinkMetadata[]>(`/api/v1/labels/${labelId}/share-links`, catalogConfig)).data;
}
export async function revokeAnonymousViewerLink(labelId: string, grantId: string, version: number) {
  await apiClient.delete(`/api/v1/labels/${labelId}/share-links/${grantId}`, { ...catalogConfig, params: { version } });
}

export function buildPublicShareUrl(rawToken: string) {
  return `${window.location.origin}/shared#token=${encodeURIComponent(rawToken)}`;
}
