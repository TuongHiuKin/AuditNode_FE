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
  updateSnapshot({ status: "initializing", accessToken: null, user: null, roles: [] });
}

export function setAccessToken(accessToken: string) {
  updateSnapshot({ ...snapshot, accessToken });
}

export function setAuthenticatedSession(accessToken: string, user: CurrentUser) {
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
  sessionStorage.removeItem("dependencyGraphState");
  clearQueryCache();
}

function updateSnapshot(next: AuthSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}
