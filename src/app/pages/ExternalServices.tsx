import { useState } from "react";
import axios from "axios";
import { Cloud, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EXTERNAL_SERVICE_KINDS, type ExternalService } from "@/features/external-services/api/externalServicesApi";
import { useExternalServices } from "@/features/external-services/api/useExternalServices";

const EMPTY_DRAFT = {
  name: "",
  kind: "SaaS",
  environment: "Production",
  endpoint: "",
  provider: "",
  protocol: "HTTPS",
  port: "",
  notes: "",
};

/**
 * Third-party services the owner's catalog depends on. These have no server or
 * deployment of their own — they are recorded so dependency edges can point at
 * something outside the infrastructure.
 */
export function ExternalServices() {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editing, setEditing] = useState<ExternalService | null>(null);
  const { services, status, create, update, remove } = useExternalServices(search);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      name: draft.name,
      kind: draft.kind,
      environment: draft.environment,
      endpoint: draft.endpoint || null,
      provider: draft.provider || null,
      protocol: draft.protocol || null,
      port: draft.port ? Number(draft.port) : null,
      notes: draft.notes || null,
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, input: payload });
        toast.success("External service updated.");
      } else {
        await create.mutateAsync(payload);
        toast.success("External service recorded.");
      }
      setDraft(EMPTY_DRAFT);
      setEditing(null);
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 409) toast.error("You already recorded a service with this name.");
      else if (status === 400) toast.error("Check the required fields and the port range (1-65535).");
      else toast.error("Unable to save the external service.");
    }
  };

  const startEdit = (service: ExternalService) => {
    setEditing(service);
    setDraft({
      name: service.name,
      kind: service.kind,
      environment: service.environment,
      endpoint: service.endpoint ?? "",
      provider: service.provider ?? "",
      protocol: service.protocol ?? "",
      port: service.port?.toString() ?? "",
      notes: service.notes ?? "",
    });
  };

  const confirmDelete = async (service: ExternalService) => {
    const warning = service.dependentApplicationCount > 0
      ? `Delete "${service.name}"? ${service.dependentApplicationCount} application(s) depend on it and those dependencies will be removed.`
      : `Delete "${service.name}"?`;
    if (!window.confirm(warning)) return;
    try {
      await remove.mutateAsync(service.id);
      toast.success("External service deleted.");
      if (editing?.id === service.id) {
        setEditing(null);
        setDraft(EMPTY_DRAFT);
      }
    } catch {
      toast.error("Unable to delete the external service.");
    }
  };

  return (
    <main className="flex h-full flex-col gap-5 overflow-auto bg-background p-8">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Cloud className="text-primary" />External services
        </h1>
        <p className="text-sm text-muted-foreground">
          Third-party APIs, payment providers, mail relays and other dependencies you do not host yourself.
        </p>
      </header>

      <form
        className="grid max-w-5xl grid-cols-2 gap-2 rounded-xl border border-border bg-panel p-4 md:grid-cols-4"
        onSubmit={submit}
      >
        <input
          required
          aria-label="Service name"
          placeholder="Name (e.g. Stripe payments)"
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          className="rounded border border-border bg-background px-3 py-2"
        />
        <select
          aria-label="Service kind"
          value={draft.kind}
          onChange={(event) => setDraft({ ...draft, kind: event.target.value })}
          className="rounded border border-border bg-background px-3 py-2"
        >
          {EXTERNAL_SERVICE_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
        </select>
        <input
          required
          aria-label="Environment"
          placeholder="Environment"
          value={draft.environment}
          onChange={(event) => setDraft({ ...draft, environment: event.target.value })}
          className="rounded border border-border bg-background px-3 py-2"
        />
        <input
          aria-label="Provider"
          placeholder="Provider (e.g. Stripe, Inc.)"
          value={draft.provider}
          onChange={(event) => setDraft({ ...draft, provider: event.target.value })}
          className="rounded border border-border bg-background px-3 py-2"
        />
        <input
          aria-label="Endpoint"
          placeholder="https://api.example.com"
          value={draft.endpoint}
          onChange={(event) => setDraft({ ...draft, endpoint: event.target.value })}
          className="rounded border border-border bg-background px-3 py-2 md:col-span-2"
        />
        <input
          aria-label="Protocol"
          placeholder="Protocol"
          value={draft.protocol}
          onChange={(event) => setDraft({ ...draft, protocol: event.target.value })}
          className="rounded border border-border bg-background px-3 py-2"
        />
        <input
          aria-label="Port"
          type="number"
          min={1}
          max={65535}
          placeholder="Port"
          value={draft.port}
          onChange={(event) => setDraft({ ...draft, port: event.target.value })}
          className="rounded border border-border bg-background px-3 py-2"
        />
        <div className="flex gap-2 md:col-span-4">
          <button
            disabled={create.isPending || update.isPending}
            className="flex items-center gap-1 rounded bg-primary px-3 py-2 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {editing ? "Save changes" : <><Plus size={16} />Record service</>}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => { setEditing(null); setDraft(EMPTY_DRAFT); }}
              className="rounded border border-border px-3 py-2"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <label className="flex max-w-sm items-center gap-2 rounded border border-border bg-panel px-3 py-2">
        <Search size={16} className="text-muted-foreground" />
        <input
          aria-label="Search external services"
          placeholder="Search name, kind or provider"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full bg-transparent outline-none"
        />
      </label>

      {status === "pending" && <p className="text-sm text-muted-foreground">Loading…</p>}
      {status === "error" && <p className="text-sm text-destructive">External services could not be loaded.</p>}
      {status === "success" && services.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No external services recorded yet. Add the third-party systems your applications call.
        </p>
      )}

      {services.length > 0 && (
        <table className="w-full max-w-6xl border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2">Name</th>
              <th className="py-2">Kind</th>
              <th className="py-2">Endpoint</th>
              <th className="py-2">Provider</th>
              <th className="py-2">Environment</th>
              <th className="py-2">Used by</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id} className="border-b border-border/50">
                <td className="py-2 font-medium">{service.name}</td>
                <td className="py-2">{service.kind}</td>
                <td className="py-2 text-muted-foreground">
                  {service.endpoint ?? "—"}
                  {service.port ? `:${service.port}` : ""}
                </td>
                <td className="py-2">{service.provider ?? "—"}</td>
                <td className="py-2">{service.environment}</td>
                <td className="py-2">{service.dependentApplicationCount} app(s)</td>
                <td className="py-2">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => startEdit(service)} className="rounded border border-border px-2 py-1">
                      Edit
                    </button>
                    <button
                      onClick={() => confirmDelete(service)}
                      aria-label={`Delete ${service.name}`}
                      className="rounded border border-border px-2 py-1 text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
