export type AuthStatus = "initializing" | "authenticated" | "anonymous";

export interface CurrentUser {
  id: string;
  username: string;
  email?: string | null;
  roles: string[];
}

export interface AuthSnapshot {
  status: AuthStatus;
  accessToken: string | null;
  user: CurrentUser | null;
  roles: string[];
}

const listeners = new Set<() => void>();
const ACTIVE_VIEWER_LINK_SESSION_KEY = "auditnode.activeViewerLink";
const PUBLIC_SHARE_TOKEN_SESSION_KEY = "auditnode.shareToken";
let clearQueryCache: () => void = () => undefined;
let snapshot: AuthSnapshot = {
  status: "initializing",
  accessToken: null,
  user: null,
  roles: [],
};

export const getAuthSnapshot = () => snapshot;
export const getAccessToken = () => snapshot.accessToken;

export function subscribeToAuth(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function beginAuthInitialization() {
  // Bootstrap must not scrub the one-time Viewer artifacts. A public /shared#token=...
  // page mounts AuthProvider too, and beginAuthInitialization runs before the refresh
  // result is known - clearing there deleted the share token the page had already
  // captured, leaving it stuck on "Opening shared catalog…". The artifacts are cleared
  // on a real principal change instead (setAuthenticatedSession, clearClientSession).
  updateSnapshot({ status: "initializing", accessToken: null, user: null, roles: [] });
}

export function setAccessToken(accessToken: string) {
  updateSnapshot({ ...snapshot, accessToken });
}

export function setAuthenticatedSession(accessToken: string, user: CurrentUser) {
  clearSensitiveSessionArtifacts();
  updateSnapshot({
    status: "authenticated",
    accessToken,
    user,
    roles: [...user.roles],
  });
}

export function registerSessionCacheClearer(clearer: () => void) {
  clearQueryCache = clearer;
}

export function clearClientSession() {
  // An anonymous visitor who never held a session has no stale authenticated data
  // to purge. Scrubbing the one-time viewer artifacts or clearing the query cache
  // there destroys an open Viewer link: AuthProvider fires the bootstrap refresh
  // for every visitor, so a public /shared#token=... page would lose its token and
  // its in-flight resolve whenever that unauthenticated refresh returned 401.
  const discardedPrincipal = snapshot.status === "authenticated";
  updateSnapshot({ status: "anonymous", accessToken: null, user: null, roles: [] });
  localStorage.removeItem("auditnode_last_datacenter");
  if (!discardedPrincipal) return;
  clearSensitiveSessionArtifacts();
  clearQueryCache();
}

function clearSensitiveSessionArtifacts() {
  sessionStorage.removeItem("dependencyGraphState");
  sessionStorage.removeItem(ACTIVE_VIEWER_LINK_SESSION_KEY);
  sessionStorage.removeItem(PUBLIC_SHARE_TOKEN_SESSION_KEY);
}

function updateSnapshot(next: AuthSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}
