import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceSharingApi, type UpsertWorkspaceShare } from "./workspaceSharing";
export function useWorkspaceShares(workspaceId: string | null, enabled: boolean, search = "") {
  const client = useQueryClient(); const key = ["workspace-shares", workspaceId];
  const invalidate = () => client.invalidateQueries({ queryKey: key });
  return {
    shares: useQuery({ queryKey: key, enabled: !!workspaceId && enabled, queryFn: () => workspaceSharingApi.list(workspaceId!) }),
    options: useQuery({
      queryKey: ["workspace-share-options", workspaceId, search],
      enabled: !!workspaceId && enabled,
      queryFn: ({ signal }) => workspaceSharingApi.options(workspaceId!, search, signal),
    }),
    grant: useMutation({ mutationFn: (body: UpsertWorkspaceShare) => workspaceSharingApi.grant(workspaceId!, body), onSuccess: invalidate }),
    update: useMutation({ mutationFn: (body: UpsertWorkspaceShare) => workspaceSharingApi.update(workspaceId!, body), onSuccess: invalidate }),
    revoke: useMutation({ mutationFn: ({ userId, version }: { userId: string; version: number }) => workspaceSharingApi.revoke(workspaceId!, userId, version), onSuccess: async () => { await invalidate(); await client.invalidateQueries({ queryKey: ["workspaces"] }); } }),
  };
}
