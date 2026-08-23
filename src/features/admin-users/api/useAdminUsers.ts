import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminUsersApi } from "./adminUsers";
export function useAdminUsers(search: string, page: number, size = 25) {
  const client = useQueryClient(); const key = ["admin-users", search, page, size];
  const users = useQuery({ queryKey: key, queryFn: () => adminUsersApi.list(search, page * size, size) });
  const status = useMutation({ mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => adminUsersApi.setStatus(id, enabled), onSuccess: () => client.invalidateQueries({ queryKey: ["admin-users"] }) });
  const create = useMutation({ mutationFn: adminUsersApi.create, onSuccess: () => client.invalidateQueries({ queryKey: ["admin-users"] }) });
  const role = useMutation({ mutationFn: ({ id, systemAdmin }: { id: string; systemAdmin: boolean }) => adminUsersApi.setSystemAdmin(id, systemAdmin), onSuccess: () => client.invalidateQueries({ queryKey: ["admin-users"] }) });
  return { users, status, create, role, size };
}
