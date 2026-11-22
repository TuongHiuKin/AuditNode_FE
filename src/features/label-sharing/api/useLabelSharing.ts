import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateSharedCatalog } from "../../../shared/catalog/catalogCache";
import {
  createAnonymousViewerLink, createUserGrant, listAnonymousViewerLinks, listUserGrants, revokeAnonymousViewerLink,
  revokeUserGrant, searchShareUsers, updateUserGrant, type CreateGrantRequest, type LabelGrant,
} from "./labelSharing";

export function useLabelGrants(labelId: string | null) {
  return useQuery({
    queryKey: ["label-sharing", labelId, "grants"],
    enabled: !!labelId,
    queryFn: () => listUserGrants(labelId!),
  });
}

export function useShareOptions(labelId: string | null, search: string) {
  const normalized = search.trim();
  return useQuery({
    queryKey: ["label-sharing", labelId, "options", normalized],
    enabled: !!labelId && normalized.length >= 3,
    queryFn: () => searchShareUsers(labelId!, normalized),
  });
}

export function useShareLinks(labelId: string | null) {
  return useQuery({
    queryKey: ["label-sharing", labelId, "links"],
    enabled: !!labelId,
    queryFn: () => listAnonymousViewerLinks(labelId!),
  });
}

export function useLabelSharingMutations(labelId: string | null) {
  const client = useQueryClient();
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ["label-sharing", labelId] });
    invalidateSharedCatalog();
  };
  return {
    createGrant: useMutation({ mutationFn: (request: CreateGrantRequest) => createUserGrant(labelId!, request), onSuccess: refresh }),
    updateGrant: useMutation({ mutationFn: (grant: Pick<LabelGrant, "id" | "permission" | "expiresAt" | "version">) => updateUserGrant(labelId!, grant), onSuccess: refresh }),
    revokeGrant: useMutation({ mutationFn: ({ id, version }: Pick<LabelGrant, "id" | "version">) => revokeUserGrant(labelId!, id, version), onSuccess: refresh }),
    createLink: useMutation({ mutationFn: (expiresAt: string) => createAnonymousViewerLink(labelId!, expiresAt), onSuccess: refresh }),
    revokeLink: useMutation({ mutationFn: ({ grantId, version }: { grantId: string; version: number }) => revokeAnonymousViewerLink(labelId!, grantId, version), onSuccess: refresh }),
  };
}
