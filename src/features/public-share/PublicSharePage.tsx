import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import apiClient from "../../shared/api/client";
import type { CatalogApplication, CatalogServer } from "../../shared/catalog/types";
import type { CatalogPage } from "../../shared/catalog/types";

const TOKEN_SESSION_KEY = "auditnode.shareToken";

interface Resolution { labelId: string; ownerUserId: string; permission: "viewer"; sharesAllOwnerResources?: boolean; }
interface ShareItem { type: "server" | "application"; server?: CatalogServer; application?: CatalogApplication; }

function consumeShareToken() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const fragmentToken = params.get("token");
  if (fragmentToken) {
    sessionStorage.setItem(TOKEN_SESSION_KEY, fragmentToken);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
    return fragmentToken;
  }
  return sessionStorage.getItem(TOKEN_SESSION_KEY);
}

async function browse(token: string, resourceType: "servers" | "applications", cursor: string | null) {
  return (await apiClient.post<CatalogPage<ShareItem>>("/api/v1/share-links/browse", {
    token, resourceType, limit: 25, cursor,
  }, { skipWorkspaceHeader: true, skipAuthRefresh: true })).data;
}

export function PublicSharePage() {
  const { token, requestId } = useShareToken();
  const resolution = useQuery({
    queryKey: ["public-share", "resolve", requestId],
    enabled: !!token,
    retry: false,
    gcTime: 0,
    queryFn: async () => (await apiClient.post<Resolution>("/api/v1/share-links/resolve", { token }, { skipWorkspaceHeader: true, skipAuthRefresh: true })).data,
  });
  const servers = useInfiniteQuery({
    queryKey: ["public-share", requestId, "servers", resolution.data?.labelId], enabled: !!token && !!resolution.data,
    initialPageParam: null as string | null, retry: false,
    gcTime: 0,
    queryFn: ({ pageParam }) => browse(token!, "servers", pageParam),
    getNextPageParam: (page) => page.hasNextPage ? page.nextCursor : undefined,
  });
  const applications = useInfiniteQuery({
    queryKey: ["public-share", requestId, "applications", resolution.data?.labelId], enabled: !!token && !!resolution.data,
    initialPageParam: null as string | null, retry: false,
    gcTime: 0,
    queryFn: ({ pageParam }) => browse(token!, "applications", pageParam),
    getNextPageParam: (page) => page.hasNextPage ? page.nextCursor : undefined,
  });

  if (!token) return <PublicShell title="Share link unavailable" detail="Open the original Viewer link again." />;
  if (resolution.isPending) return <PublicShell title="Opening shared catalog…" detail="Validating the Viewer link." />;
  if (resolution.isError) return <PublicShell title="Share link unavailable" detail="The link is invalid, expired, or revoked." />;
  const serverRows = servers.data?.pages.flatMap((page) => page.items.flatMap((item) => item.server ? [item.server] : [])) ?? [];
  const applicationRows = applications.data?.pages.flatMap((page) => page.items.flatMap((item) => item.application ? [item.application] : [])) ?? [];

  return <main className="min-h-screen bg-background p-6 text-foreground">
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-xl border border-border bg-panel p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Viewer · read only</p><h1 className="mt-1 text-xl font-semibold">Shared catalog</h1><p className="mt-1 text-sm text-muted-foreground">Shared by {resolution.data.ownerUserId}</p></header>
      <section className="rounded-xl border border-border bg-panel p-4"><h2 className="mb-3 font-semibold">Servers</h2>{serverRows.length ? <ul className="divide-y divide-border">{serverRows.map((server) => <li key={server.id} className="flex justify-between py-2 text-sm"><span>{server.hostname}</span><span className="font-mono text-muted-foreground">{server.ipAddress}</span></li>)}</ul> : <Empty loading={servers.isPending} />}{servers.hasNextPage && <LoadMore onClick={() => void servers.fetchNextPage()} busy={servers.isFetchingNextPage} />}</section>
      <section className="rounded-xl border border-border bg-panel p-4"><h2 className="mb-3 font-semibold">Applications</h2>{applicationRows.length ? <ul className="divide-y divide-border">{applicationRows.map((app) => <li key={app.id} className="flex justify-between py-2 text-sm"><span>{app.appName}</span><span className="font-mono text-muted-foreground">{app.appCode}</span></li>)}</ul> : <Empty loading={applications.isPending} />}{applications.hasNextPage && <LoadMore onClick={() => void applications.fetchNextPage()} busy={applications.isFetchingNextPage} />}</section>
    </div>
  </main>;
}

let shareRequestSequence = 0;

function nextShareRequest(token: string | null) {
  shareRequestSequence += 1;
  return { token, requestId: `share-request-${shareRequestSequence}` };
}

function useShareToken() {
  // Lazy capture ensures the fragment is scrubbed before any API request or child navigation.
  const [share, setShare] = useState(() => nextShareRequest(consumeShareToken()));
  useEffect(() => {
    const captureNavigation = () => {
      const nextToken = consumeShareToken();
      setShare((current) => nextToken && nextToken !== current.token
        ? nextShareRequest(nextToken)
        : current);
    };
    window.addEventListener("hashchange", captureNavigation);
    window.addEventListener("popstate", captureNavigation);
    return () => {
      window.removeEventListener("hashchange", captureNavigation);
      window.removeEventListener("popstate", captureNavigation);
    };
  }, []);
  return share;
}
function PublicShell({ title, detail }: { title: string; detail: string }) { return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground"><div className="rounded-xl border border-border bg-panel p-6 text-center"><h1 className="font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{detail}</p></div></main>; }
function Empty({ loading }: { loading: boolean }) { return <p className="py-5 text-sm text-muted-foreground">{loading ? "Loading…" : "No resources in this shared label."}</p>; }
function LoadMore({ onClick, busy }: { onClick: () => void; busy: boolean }) { return <button onClick={onClick} disabled={busy} className="mt-3 rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50">{busy ? "Loading…" : "Load more"}</button>; }
