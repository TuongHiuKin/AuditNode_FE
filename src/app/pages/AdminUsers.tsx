import { useState } from "react";
import axios from "axios";
import { Search, Users } from "lucide-react";
import { toast } from "sonner";
import { useAdminUsers } from "../../features/admin-users/api/useAdminUsers";
import type { AdminUser } from "../../features/admin-users/api/adminUsers";

export function AdminUsers() {
  const [input, setInput] = useState(""); const [search, setSearch] = useState(""); const [page, setPage] = useState(0);
  const [draft, setDraft] = useState({ username: "", email: "", password: "" });
  const { users, status, create, role, size } = useAdminUsers(search, page);
  const changeRole = async (user: AdminUser) => {
    const systemAdmin = !user.isSystemAdmin;
    if (!window.confirm(`${systemAdmin ? "Grant" : "Revoke"} SystemAdmin for ${user.username}?`)) return;
    try { await role.mutateAsync({ id: user.id, systemAdmin }); toast.success("System role updated."); }
    catch (error: unknown) { toast.error(axios.isAxiosError(error) && error.response?.status === 409 ? "The last SystemAdmin cannot be revoked." : "Unable to update system role."); }
  };
  return <main className="flex h-full flex-col gap-5 overflow-auto bg-background p-8">
    <header><h1 className="flex items-center gap-2 text-xl font-bold"><Users className="text-primary" />User management</h1><p className="text-sm text-muted-foreground">Manage identities and system administrators.</p></header>
    <form className="grid max-w-3xl grid-cols-4 gap-2 rounded-xl border border-border bg-panel p-4" onSubmit={async (event) => { event.preventDefault(); try { await create.mutateAsync(draft); setDraft({ username: "", email: "", password: "" }); toast.success("User created."); } catch { toast.error("Unable to create user. Username or email may already exist."); } }}>
      <input required aria-label="New username" placeholder="Username" value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} className="rounded border border-border bg-background px-3" />
      <input required type="email" aria-label="New email" placeholder="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="rounded border border-border bg-background px-3" />
      <input required minLength={8} type="password" aria-label="Temporary password" placeholder="Password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} className="rounded border border-border bg-background px-3" />
      <button disabled={create.isPending} className="rounded bg-primary px-3 py-2 font-semibold text-primary-foreground disabled:opacity-50">Create user</button>
    </form>
    <form className="flex max-w-xl gap-2" onSubmit={(e) => { e.preventDefault(); setPage(0); setSearch(input.trim()); }}><label className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><span className="sr-only">Search users</span><input aria-label="Search users" value={input} onChange={(e) => setInput(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm" placeholder="Username or email" /></label><button className="rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Search</button></form>
    {users.isPending ? <p role="status">Loading users...</p> : users.isError ? <p className="text-danger">Unable to load users.</p> : <div className="overflow-hidden rounded-xl border border-border"><table className="w-full text-left text-sm"><thead className="bg-panel text-xs uppercase text-muted-foreground"><tr><th className="p-3">User</th><th>Email</th><th>Workspaces</th><th>Status</th><th className="text-right pr-3">Actions</th></tr></thead><tbody>{users.data?.map((user) => <tr key={user.id} className="border-t border-border"><td className="p-3 font-semibold">{user.username}</td><td>{user.email || "—"}</td><td>{user.workspaceCount}</td><td>{user.enabled ? "Active" : "Locked"}</td><td className="space-x-2 pr-3 text-right"><button disabled={status.isPending} onClick={() => status.mutate({ id: user.id, enabled: !user.enabled })} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50">{user.enabled ? "Lock" : "Activate"}</button><button disabled={role.isPending} onClick={() => void changeRole(user)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50">{user.isSystemAdmin ? "Revoke SystemAdmin" : "Grant SystemAdmin"}</button></td></tr>)}</tbody></table></div>}
    <div className="flex justify-end gap-2"><button disabled={page === 0} onClick={() => setPage((value) => value - 1)} className="rounded border border-border px-3 py-1 disabled:opacity-40">Previous</button><span className="px-2 py-1 text-sm">Page {page + 1}</span><button disabled={(users.data?.length ?? 0) < size} onClick={() => setPage((value) => value + 1)} className="rounded border border-border px-3 py-1 disabled:opacity-40">Next</button></div>
  </main>;
}
