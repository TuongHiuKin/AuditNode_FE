import { useEffect, useMemo, useState } from "react";
import { Copy, Link2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import type { CatalogLabel } from "../../../shared/catalog/types";
import { buildPublicShareUrl, type CreatedShareLink, type GrantPermission } from "../api/labelSharing";
import { useLabelGrants, useLabelSharingMutations, useShareLinks, useShareOptions } from "../api/useLabelSharing";

const LINK_SESSION_KEY = "auditnode.activeViewerLink";

export function ShareLabelModal({ open, onOpenChange, labels }: { open: boolean; onOpenChange: (open: boolean) => void; labels: CatalogLabel[] }) {
  const [labelId, setLabelId] = useState("");
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [permission, setPermission] = useState<GrantPermission>("viewer");
  const [ownerShareConfirmed, setOwnerShareConfirmed] = useState(false);
  const [activeLink, setActiveLink] = useState<(CreatedShareLink & { labelId: string; url: string }) | null>(null);
  const grants = useLabelGrants(labelId || null);
  const options = useShareOptions(labelId || null, search);
  const links = useShareLinks(labelId || null);
  const mutations = useLabelSharingMutations(labelId || null);
  const selectedLabel = useMemo(() => labels.find((label) => label.id === labelId), [labelId, labels]);

  useEffect(() => {
    if (!open || labelId || labels.length === 0) return;
    setLabelId(labels[0].id);
  }, [labelId, labels, open]);
  useEffect(() => {
    const stored = sessionStorage.getItem(LINK_SESSION_KEY);
    if (!stored) return;
    try { setActiveLink(JSON.parse(stored)); } catch { sessionStorage.removeItem(LINK_SESSION_KEY); }
  }, []);
  if (!open) return null;

  const ownerWarning = selectedLabel?.kind === "owner" || selectedLabel?.isProtected;
  const ownerShareBlocked = ownerWarning && !ownerShareConfirmed;
  const createGrant = async () => {
    if (!userId) return;
    await mutations.createGrant.mutateAsync({ granteeUserId: userId, permission, expiresAt: null });
    setUserId("");
    toast.success("Label access granted.");
  };
  const createLink = async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const created = await mutations.createLink.mutateAsync(expiresAt);
    const value = { ...created, labelId, url: buildPublicShareUrl(created.token) };
    sessionStorage.setItem(LINK_SESSION_KEY, JSON.stringify(value));
    setActiveLink(value);
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="share-label-title" className="w-full max-w-2xl rounded-xl border border-border bg-panel p-5 shadow-2xl">
      <header className="mb-4 flex items-start justify-between">
        <div><h2 id="share-label-title" className="font-semibold text-foreground">Share a label</h2><p className="text-xs text-muted-foreground">Editors must be existing users. Public links are Viewer-only.</p></div>
        <button aria-label="Close share dialog" className="rounded p-1 text-muted-foreground hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-primary" onClick={() => onOpenChange(false)}><X size={18} /></button>
      </header>
      <div className="grid gap-4">
        <label className="grid gap-1 text-xs text-muted-foreground">Label
          <select aria-label="Label to share" value={labelId} onChange={(event) => { setLabelId(event.target.value); setUserId(""); setOwnerShareConfirmed(false); }} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            {labels.map((label) => <option key={label.id} value={label.id}>{label.key}: {label.value}{label.isProtected ? " 🔒" : ""}</option>)}
          </select>
        </label>
        {ownerWarning && <div role="alert" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
          <p>This protected Owner label shares every current and future resource owned by you.</p>
          <label className="mt-2 flex items-center gap-2 font-semibold"><input type="checkbox" checked={ownerShareConfirmed} onChange={(event) => setOwnerShareConfirmed(event.target.checked)} />I understand the full-catalog scope</label>
        </div>}
        <div className="grid gap-2 rounded-lg border border-border p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} /> Invite an existing user</h3>
          <input aria-label="Search system users" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Username or email (3+ characters)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <div className="grid grid-cols-[1fr_130px_auto] gap-2">
            <select aria-label="Grant user" value={userId} onChange={(event) => setUserId(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="">Select enabled user</option>{options.data?.users.map((user) => <option key={user.id} value={user.id}>{user.username}{user.email ? ` · ${user.email}` : ""}</option>)}
            </select>
            <select aria-label="Grant permission" value={permission} onChange={(event) => setPermission(event.target.value as GrantPermission)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="viewer">Viewer</option><option value="editor">Editor</option></select>
            <button disabled={!userId || ownerShareBlocked || mutations.createGrant.isPending} onClick={() => void createGrant()} className="rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">Grant</button>
          </div>
          <div className="max-h-32 space-y-2 overflow-auto">
            {grants.data?.map((grant) => {
              const inactive = !!grant.revokedAt || (!!grant.expiresAt && new Date(grant.expiresAt) <= new Date());
              return <div key={grant.id} className="flex items-center justify-between rounded border border-border px-3 py-2 text-xs"><span>{grant.granteeUserId} · {grant.permission}{inactive ? " · inactive" : ""}</span>{!inactive && <span className="flex gap-2"><button className="text-primary" onClick={() => void mutations.updateGrant.mutateAsync({ ...grant, permission: grant.permission === "viewer" ? "editor" : "viewer" })}>Make {grant.permission === "viewer" ? "Editor" : "Viewer"}</button><button className="text-danger" onClick={() => void mutations.revokeGrant.mutateAsync(grant)}>Revoke</button></span>}</div>;
            })}
          </div>
        </div>
        <div className="grid gap-2 rounded-lg border border-border p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Link2 size={16} /> Anonymous Viewer link</h3>
          <p className="text-xs text-muted-foreground">Anyone with the link can browse this label for seven days. The token is placed only in the URL fragment and removed when opened.</p>
          {activeLink?.labelId === labelId ? <div className="flex gap-2"><input aria-label="Public share link" readOnly value={activeLink.url} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs" /><button aria-label="Copy public share link" className="rounded-lg border border-border px-3" onClick={() => void navigator.clipboard.writeText(activeLink.url).then(() => toast.success("Link copied."))}><Copy size={16} /></button></div> : <button disabled={ownerShareBlocked || mutations.createLink.isPending} onClick={() => void createLink()} className="w-fit rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary disabled:opacity-50">Create Viewer link</button>}
          <div className="max-h-32 space-y-2 overflow-auto">
            {links.data?.map((link) => <div key={link.grantId} className="flex items-center justify-between rounded border border-border px-3 py-2 text-xs"><span>{link.revokedAt ? "Revoked" : new Date(link.expiresAt) <= new Date() ? "Expired" : `Expires ${new Date(link.expiresAt).toLocaleString()}`}</span>{!link.revokedAt && <button className="text-danger" onClick={() => void mutations.revokeLink.mutateAsync(link).then(() => { if (activeLink?.grantId === link.grantId) { sessionStorage.removeItem(LINK_SESSION_KEY); setActiveLink(null); } })}>Revoke</button>}</div>)}
          </div>
        </div>
      </div>
    </section>
  </div>;
}
