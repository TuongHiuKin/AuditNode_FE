import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  useLabelGrants,
  useOwnerCatalog,
  type AdminLabelGrant,
} from "@/features/admin-users/api/adminOwnerCatalog";

type Tab = "catalog" | "sharing";

/**
 * Administrator view of one user: what that user recorded, and who they share it with.
 *
 * The catalog tab is strictly read-only — there is no edit affordance anywhere, because
 * the API exposes no write route for it. The sharing tab manages Viewer/Editor grants,
 * which is the one thing an administrator may change on a user's behalf.
 */
export function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("catalog");
  const catalog = useOwnerCatalog(id);

  return (
    <main className="flex h-full flex-col gap-5 overflow-auto bg-background p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link to="/admin/users" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} />Back to users
          </Link>
          <h1 className="text-xl font-bold">{catalog.data?.username ?? "User"}</h1>
          <p className="text-sm text-muted-foreground">
            {catalog.data?.email ?? "—"} · catalog visibility and sharing for this user
          </p>
        </div>
        <span className="flex items-center gap-1 rounded border border-border px-3 py-1 text-xs text-muted-foreground">
          <Lock size={12} />Read-only catalog
        </span>
      </header>

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("catalog")}
          aria-pressed={tab === "catalog"}
          className={`px-3 py-2 text-sm font-medium ${tab === "catalog" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
        >
          Catalog
        </button>
        <button
          onClick={() => setTab("sharing")}
          aria-pressed={tab === "sharing"}
          className={`px-3 py-2 text-sm font-medium ${tab === "sharing" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
        >
          Sharing
        </button>
      </div>

      {catalog.status === "pending" && <p className="text-sm text-muted-foreground">Loading…</p>}
      {catalog.status === "error" && <p className="text-sm text-destructive">This user could not be loaded.</p>}

      {catalog.status === "success" && catalog.data && tab === "catalog" && (
        <CatalogTab catalog={catalog.data} />
      )}
      {catalog.status === "success" && catalog.data && tab === "sharing" && (
        <SharingTab ownerUserId={catalog.data.ownerUserId} labels={catalog.data.labels} />
      )}
    </main>
  );
}

function CatalogTab({ catalog }: { catalog: NonNullable<ReturnType<typeof useOwnerCatalog>["data"]> }) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Servers ({catalog.servers.length})
        </h2>
        {catalog.servers.length === 0 ? <Empty label="No servers recorded." /> : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2">Hostname</th><th className="py-2">IP</th><th className="py-2">OS</th>
                <th className="py-2">Environment</th><th className="py-2">Status</th>
                <th className="py-2">Datacenter</th><th className="py-2">Labels</th>
              </tr>
            </thead>
            <tbody>
              {catalog.servers.map((server) => (
                <tr key={server.id} className="border-b border-border/50">
                  <td className="py-2 font-medium">{server.hostname}</td>
                  <td className="py-2">{server.ipAddress}</td>
                  <td className="py-2">{server.osType}</td>
                  <td className="py-2">{server.environment}</td>
                  <td className="py-2">{server.status}</td>
                  <td className="py-2">{server.datacenter || "—"}</td>
                  <td className="py-2 text-muted-foreground">{server.labels.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Applications ({catalog.applications.length})
        </h2>
        {catalog.applications.length === 0 ? <Empty label="No applications recorded." /> : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2">Code</th><th className="py-2">Name</th><th className="py-2">Team</th>
                <th className="py-2">Tech</th><th className="py-2">Ports</th><th className="py-2">Labels</th>
              </tr>
            </thead>
            <tbody>
              {catalog.applications.map((app) => (
                <tr key={app.id} className="border-b border-border/50">
                  <td className="py-2 font-medium">{app.appCode}</td>
                  <td className="py-2">{app.appName}</td>
                  <td className="py-2">{app.ownerTeam}</td>
                  <td className="py-2">{app.techStack}</td>
                  <td className="py-2">
                    {app.ports.length === 0 ? "—" : app.ports
                      .map((port) => `${port.serverHostname || "?"}:${port.portNumber}/${port.protocol}`)
                      .join(", ")}
                  </td>
                  <td className="py-2 text-muted-foreground">{app.labels.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          External services ({catalog.externalServices.length})
        </h2>
        {catalog.externalServices.length === 0 ? <Empty label="No external services recorded." /> : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2">Name</th><th className="py-2">Kind</th>
                <th className="py-2">Endpoint</th><th className="py-2">Provider</th><th className="py-2">Environment</th>
              </tr>
            </thead>
            <tbody>
              {catalog.externalServices.map((service) => (
                <tr key={service.id} className="border-b border-border/50">
                  <td className="py-2 font-medium">{service.name}</td>
                  <td className="py-2">{service.kind}</td>
                  <td className="py-2 text-muted-foreground">{service.endpoint ?? "—"}</td>
                  <td className="py-2">{service.provider ?? "—"}</td>
                  <td className="py-2">{service.environment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Dependencies ({catalog.dependencies.length})
        </h2>
        {catalog.dependencies.length === 0 ? <Empty label="No dependencies recorded." /> : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2">From</th><th className="py-2">To</th>
              </tr>
            </thead>
            <tbody>
              {catalog.dependencies.map((dependency) => (
                <tr key={dependency.id} className="border-b border-border/50">
                  <td className="py-2 font-medium">{dependency.sourceAppCode}</td>
                  <td className="py-2">
                    {dependency.externalServiceName
                      ? <span className="text-primary">{dependency.externalServiceName} (external)</span>
                      : dependency.destinationAppCode ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function SharingTab({
  ownerUserId,
  labels,
}: {
  ownerUserId: string;
  labels: { id: string; key: string; value: string; kind: string; activeGrantCount: number }[];
}) {
  const [labelId, setLabelId] = useState<string>(labels[0]?.id ?? "");
  const selected = useMemo(() => labels.find((label) => label.id === labelId), [labels, labelId]);
  const { grants, status, create, update, revoke } = useLabelGrants(ownerUserId, labelId || undefined);
  const [draft, setDraft] = useState({ granteeUserId: "", permission: "viewer" });

  if (labels.length === 0)
    return <Empty label="This user has no shareable labels yet." />;

  const active = grants.filter((grant) => grant.revokedAt === null);

  const addGrant = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await create.mutateAsync({ granteeUserId: draft.granteeUserId, permission: draft.permission, expiresAt: null });
      setDraft({ granteeUserId: "", permission: "viewer" });
      toast.success("Grant created.");
    } catch {
      toast.error("The grant could not be created. Check the user id and permission.");
    }
  };

  const changePermission = async (grant: AdminLabelGrant, permission: string) => {
    try {
      await update.mutateAsync({ id: grant.id, permission, expiresAt: grant.expiresAt, version: grant.version });
      toast.success("Grant updated.");
    } catch {
      toast.error("The grant changed elsewhere. Reload and retry.");
    }
  };

  const revokeGrant = async (grant: AdminLabelGrant) => {
    if (!window.confirm("Revoke this grant? The user will lose access to the shared resources.")) return;
    try {
      await revoke.mutateAsync({ id: grant.id, version: grant.version });
      toast.success("Grant revoked.");
    } catch {
      toast.error("The grant could not be revoked.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck size={14} />
        Manage who this user shares with. You cannot edit their servers, applications or services.
      </p>

      <label className="flex max-w-md flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Label</span>
        <select
          aria-label="Label"
          value={labelId}
          onChange={(event) => setLabelId(event.target.value)}
          className="rounded border border-border bg-background px-3 py-2"
        >
          {labels.map((label) => (
            <option key={label.id} value={label.id}>
              {label.key}={label.value} ({label.activeGrantCount} active)
            </option>
          ))}
        </select>
      </label>

      {selected?.kind === "owner" && (
        <p className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm">
          This is the owner label: sharing it exposes the user&apos;s entire catalog.
        </p>
      )}

      <form onSubmit={addGrant} className="flex max-w-3xl flex-wrap items-end gap-2 rounded-xl border border-border bg-panel p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Grantee user id</span>
          <input
            required
            aria-label="Grantee user id"
            value={draft.granteeUserId}
            onChange={(event) => setDraft({ ...draft, granteeUserId: event.target.value })}
            className="w-72 rounded border border-border bg-background px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Permission</span>
          <select
            aria-label="Permission"
            value={draft.permission}
            onChange={(event) => setDraft({ ...draft, permission: event.target.value })}
            className="rounded border border-border bg-background px-3 py-2"
          >
            <option value="viewer">viewer</option>
            <option value="editor">editor</option>
          </select>
        </label>
        <button className="rounded bg-primary px-3 py-2 font-semibold text-primary-foreground">Add grant</button>
      </form>

      {status === "pending" && <p className="text-sm text-muted-foreground">Loading grants…</p>}
      {status === "success" && active.length === 0 && <Empty label="No active grants on this label." />}

      {active.length > 0 && (
        <table className="w-full max-w-4xl border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2">Grantee</th><th className="py-2">Permission</th>
              <th className="py-2">Expires</th><th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {active.map((grant) => (
              <tr key={grant.id} className="border-b border-border/50">
                <td className="py-2 font-mono text-xs">{grant.granteeUserId}</td>
                <td className="py-2">
                  <select
                    aria-label={`Permission for ${grant.granteeUserId}`}
                    value={grant.permission}
                    onChange={(event) => changePermission(grant, event.target.value)}
                    className="rounded border border-border bg-background px-2 py-1"
                  >
                    <option value="viewer">viewer</option>
                    <option value="editor">editor</option>
                  </select>
                </td>
                <td className="py-2 text-muted-foreground">{grant.expiresAt ? new Date(grant.expiresAt).toLocaleString() : "never"}</td>
                <td className="py-2 text-right">
                  <button onClick={() => revokeGrant(grant)} className="rounded border border-border px-2 py-1 text-destructive">
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}
