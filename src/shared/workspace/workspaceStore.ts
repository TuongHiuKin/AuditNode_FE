const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const listeners = new Set<() => void>();
let selectedWorkspaceId: string | null = null;

export const getSelectedWorkspaceId = () => selectedWorkspaceId;
export const isValidWorkspaceId = (value: string | null | undefined) =>
  !!value && value !== EMPTY_GUID;

export function subscribeToWorkspace(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSelectedWorkspaceId(workspaceId: string, options: { persist?: boolean } = {}) {
  console.log("setSelectedWorkspaceId called with:", workspaceId);
  if (!isValidWorkspaceId(workspaceId)) {
    console.log("Invalid workspaceId!", workspaceId);
    clearWorkspaceSelection();
    return false;
  }

  const changed = selectedWorkspaceId !== workspaceId;
  selectedWorkspaceId = workspaceId;
  if (options.persist !== false) localStorage.setItem("workspaceId", workspaceId);
  if (changed) emit();
  return true;
}

export function clearWorkspaceSelection(options: { preservePersisted?: boolean } = {}) {
  const changed = selectedWorkspaceId !== null;
  selectedWorkspaceId = null;
  if (!options.preservePersisted) localStorage.removeItem("workspaceId");
  if (changed) emit();
}

export function tenantQueryKey(scope: string, workspaceId: string | null, ...parts: readonly unknown[]) {
  return [scope, workspaceId ?? "no-workspace", ...parts] as const;
}

function emit() {
  listeners.forEach((listener) => listener());
}
