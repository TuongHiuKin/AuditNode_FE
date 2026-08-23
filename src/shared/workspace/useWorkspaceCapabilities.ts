import { useWorkspace } from "./WorkspaceContext";

const noCapabilities = {
  canManageShares: false,
  canWriteInventory: false,
  canEditGraph: false,
  canManageDatacenters: false,
  canManageLabels: false,
  canImport: false,
} as const;

export function useWorkspaceCapabilities() {
  const { selectedWorkspace } = useWorkspace();
  return selectedWorkspace?.capabilities ?? noCapabilities;
}
