import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../../../shared/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../shared/ui/Dialog";
import { useWorkspace } from "../../../shared/workspace/WorkspaceContext";
import { useWorkspaceShares } from "../api/useWorkspaceShares";
import type { ShareRole, ShareScopeMode, WorkspaceShare } from "../api/workspaceSharing";

export function ShareWorkspaceModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { selectedWorkspaceId } = useWorkspace(); const [search, setSearch] = useState("");
  const { shares, options, grant, update, revoke } = useWorkspaceShares(selectedWorkspaceId, open, search);
  const [userId, setUserId] = useState(""); const [role, setRole] = useState<ShareRole>("viewer");
  const [mode, setMode] = useState<ShareScopeMode>("all"); const [targetIds, setTargetIds] = useState<string[]>([]); const [version, setVersion] = useState<number | null>(null);
  const reset = () => { setUserId(""); setRole("viewer"); setMode("all"); setTargetIds([]); setVersion(null); };
  const edit = (share: WorkspaceShare) => { setUserId(share.userId); setRole(share.role); setMode(share.scopeMode); setTargetIds(share.targetIds); setVersion(share.version); };
  const submit = async () => { const body = { userId, role, scopeMode: mode, targetIds: mode === "all" ? [] : targetIds, version: version ?? 0 }; try { await (version === null ? grant.mutateAsync(body) : update.mutateAsync(body)); toast.success(version === null ? "Workspace access granted." : "Workspace access updated."); reset(); } catch (error: unknown) { toast.error(axios.isAxiosError(error) && error.response?.status === 409 ? "This share changed elsewhere. Refresh and try again." : "Unable to save workspace access."); } };
  const targets = mode === "labels" ? options.data?.labels : options.data?.frames;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Share workspace</DialogTitle><DialogDescription>Select an active user and the exact workspace scope to share.</DialogDescription></DialogHeader>
    <div className="grid gap-3"><label className="grid gap-1 text-xs text-muted-foreground">Find user<input aria-label="Find user" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm" /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">User<select aria-label="Share user" value={userId} disabled={version !== null} onChange={(e) => setUserId(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm"><option value="">Select active user</option>{options.data?.users.map((user) => <option key={user.id} value={user.id}>{user.username}{user.email ? ` · ${user.email}` : ""}</option>)}</select></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Role<select aria-label="Share role" value={role} onChange={(e) => setRole(e.target.value as ShareRole)} className="rounded-md border border-border bg-background px-3 py-2 text-sm"><option value="viewer">Viewer</option><option value="auditor">Auditor</option><option value="admin">Workspace Admin</option></select></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Scope<select aria-label="Share scope" value={mode} onChange={(e) => { setMode(e.target.value as ShareScopeMode); setTargetIds([]); }} className="rounded-md border border-border bg-background px-3 py-2 text-sm"><option value="all">Entire workspace</option><option value="labels">Labels</option><option value="frames">Boundary frames</option></select></label>
      {mode !== "all" && <fieldset className="max-h-32 overflow-auto rounded-md border border-border p-2"><legend className="px-1 text-xs text-muted-foreground">Select {mode}</legend>{targets?.map((target) => <label key={target.id} className="flex gap-2 py-1 text-sm"><input type="checkbox" checked={targetIds.includes(target.id)} onChange={() => setTargetIds((ids) => ids.includes(target.id) ? ids.filter((id) => id !== target.id) : [...ids, target.id])} />{target.displayName}</label>)}</fieldset>}
      <div className="max-h-40 space-y-2 overflow-auto">{shares.data?.map((share) => <div key={share.userId} className="flex justify-between rounded border border-border p-2 text-xs"><span>{share.userId} · {share.role} · {share.scopeMode}</span><span className="space-x-2"><button onClick={() => edit(share)} className="text-primary">Edit</button><button onClick={async () => { if (!window.confirm(`Revoke access for ${share.userId}?`)) return; await revoke.mutateAsync({ userId: share.userId, version: share.version }); }} className="text-danger">Remove</button></span></div>)}</div>
    </div><DialogFooter><Button onClick={() => void submit()} disabled={!userId || (mode !== "all" && targetIds.length === 0) || grant.isPending || update.isPending}>{version === null ? "Share" : "Save changes"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
