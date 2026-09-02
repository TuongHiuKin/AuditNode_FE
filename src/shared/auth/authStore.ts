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
  clearSensitiveSessionArtifacts();
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
  updateSnapshot({ status: "anonymous", accessToken: null, user: null, roles: [] });
  localStorage.removeItem("auditnode_last_datacenter");
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
