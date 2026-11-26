import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/shared/api/client";
import { API_ENDPOINTS } from "@/config/endpoints";

/** Read-only snapshot of another user's catalog. Mirrors AdminOwnerCatalogDto. */
export interface AdminOwnerCatalog {
  ownerUserId: string;
  username: string | null;
  email: string | null;
  servers: {
    id: string;
    hostname: string;
    ipAddress: string;
    osType: string;
    environment: string;
    status: string;
    datacenter: string;
    labels: string[];
  }[];
  applications: {
    id: string;
    appCode: string;
    appName: string;
    ownerTeam: string;
    techStack: string;
    risk: string;
    ports: { id: string; portNumber: number; protocol: string; serverHostname: string }[];
    labels: string[];
  }[];
  externalServices: {
    id: string;
    name: string;
    kind: string;
    endpoint: string | null;
    provider: string | null;
    environment: string;
  }[];
  dependencies: {
    id: string;
    sourceAppCode: string;
    destinationAppCode: string | null;
    externalServiceName: string | null;
  }[];
  labels: { id: string; key: string; value: string; kind: string; activeGrantCount: number }[];
}

export interface AdminLabelGrant {
  id: string;
  labelId: string;
  granteeUserId: string;
  permission: string;
  expiresAt: string | null;
  revokedAt: string | null;
  version: number;
  sharesAllOwnerResources?: boolean;
  warningCode?: string | null;
}

export async function fetchOwnerCatalog(ownerUserId: string): Promise<AdminOwnerCatalog> {
  const response = await apiClient.get<AdminOwnerCatalog>(API_ENDPOINTS.ADMIN.USER_CATALOG(ownerUserId));
  return response.data;
}

export async function fetchLabelGrants(ownerUserId: string, labelId: string): Promise<AdminLabelGrant[]> {
  const response = await apiClient.get<AdminLabelGrant[]>(API_ENDPOINTS.ADMIN.USER_GRANTS(ownerUserId), {
    params: { labelId },
  });
  return response.data;
}

export async function createLabelGrant(
  ownerUserId: string,
  labelId: string,
  body: { granteeUserId: string; permission: string; expiresAt: string | null },
): Promise<AdminLabelGrant> {
  const response = await apiClient.post<AdminLabelGrant>(API_ENDPOINTS.ADMIN.USER_GRANTS(ownerUserId), body, {
    params: { labelId },
  });
  return response.data;
}

export async function updateLabelGrant(
  ownerUserId: string,
  labelId: string,
  grantId: string,
  body: { permission: string; expiresAt: string | null; version: number },
): Promise<AdminLabelGrant> {
  const response = await apiClient.put<AdminLabelGrant>(
    `${API_ENDPOINTS.ADMIN.USER_GRANTS(ownerUserId)}/${grantId}`,
    body,
    { params: { labelId } },
  );
  return response.data;
}

export async function revokeLabelGrant(
  ownerUserId: string,
  labelId: string,
  grantId: string,
  version: number,
): Promise<void> {
  await apiClient.delete(`${API_ENDPOINTS.ADMIN.USER_GRANTS(ownerUserId)}/${grantId}`, {
    params: { labelId, version },
  });
}

export function useOwnerCatalog(ownerUserId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "catalog", ownerUserId],
    queryFn: () => fetchOwnerCatalog(ownerUserId!),
    enabled: Boolean(ownerUserId),
  });
}

export function useLabelGrants(ownerUserId: string | undefined, labelId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "grants", ownerUserId, labelId] });
  const alsoRefreshCatalog = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "catalog", ownerUserId] });

  const query = useQuery({
    queryKey: ["admin", "grants", ownerUserId, labelId],
    queryFn: () => fetchLabelGrants(ownerUserId!, labelId!),
    enabled: Boolean(ownerUserId && labelId),
  });

  const create = useMutation({
    mutationFn: (body: { granteeUserId: string; permission: string; expiresAt: string | null }) =>
      createLabelGrant(ownerUserId!, labelId!, body),
    onSuccess: () => { invalidate(); alsoRefreshCatalog(); },
  });

  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: string; permission: string; expiresAt: string | null; version: number }) =>
      updateLabelGrant(ownerUserId!, labelId!, id, body),
    onSuccess: () => { invalidate(); alsoRefreshCatalog(); },
  });

  const revoke = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      revokeLabelGrant(ownerUserId!, labelId!, id, version),
    onSuccess: () => { invalidate(); alsoRefreshCatalog(); },
  });

  return { grants: query.data ?? [], status: query.status, create, update, revoke };
}
