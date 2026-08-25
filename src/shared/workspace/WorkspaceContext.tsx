import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/client";
import type { components } from "../api/v1-contract";
import { useAuth } from "../auth/AuthContext";
import {
  clearWorkspaceSelection,
  getSelectedWorkspaceId,
  isValidWorkspaceId,
  setSelectedWorkspaceId,
  subscribeToWorkspace,
} from "./workspaceStore";

export type WorkspaceRelationship = "owner" | "admin" | "shared";
export type WorkspaceRole = "owner" | "admin" | "auditor" | "viewer";
export type WorkspaceScopeMode = "all" | "labels" | "frames";

export interface WorkspaceScopeTarget { id: string; displayName: string; }
export interface WorkspaceScope {
  mode: WorkspaceScopeMode;
  labels: WorkspaceScopeTarget[];
  frames: WorkspaceScopeTarget[];
}
export interface WorkspaceCapabilities {
  canManageShares: boolean;
  canWriteInventory: boolean;
  canEditGraph: boolean;
  canManageDatacenters: boolean;
  canManageLabels: boolean;
  canImport: boolean;
}
export interface WorkspaceSummary {
  id: string;
  name: string;
  description?: string | null;
  relationship?: WorkspaceRelationship;
  effectiveRole?: WorkspaceRole;
  scope?: WorkspaceScope;
  capabilities?: WorkspaceCapabilities;
}

type WorkspaceDto = components["schemas"]["WorkspaceDto"];
const relationships: readonly WorkspaceRelationship[] = ["owner", "admin", "shared"];
const roles: readonly WorkspaceRole[] = ["owner", "admin", "auditor", "viewer"];
const scopeModes: readonly WorkspaceScopeMode[] = ["all", "labels", "frames"];

export function mapWorkspaceSummary(dto: WorkspaceDto): WorkspaceSummary {
  if (!dto.id || !dto.name) throw new Error("Workspace response is missing its id or name.");
  if (dto.relationship && !relationships.includes(dto.relationship as WorkspaceRelationship)) {
    throw new Error("Invalid workspace relationship received from the API.");
  }
  if (dto.effectiveRole && !roles.includes(dto.effectiveRole as WorkspaceRole)) {
    throw new Error("Invalid workspace role received from the API.");
  }
  if (dto.scope && !scopeModes.includes(dto.scope.mode as WorkspaceScopeMode)) {
    throw new Error("Invalid workspace scope received from the API.");
  }

  return {
    ...dto,
    id: dto.id,
    name: dto.name,
    relationship: dto.relationship as WorkspaceRelationship | undefined,
    effectiveRole: dto.effectiveRole as WorkspaceRole | undefined,
    scope: dto.scope ? { ...dto.scope, mode: dto.scope.mode as WorkspaceScopeMode } : undefined,
  };
}

export type WorkspaceStatus = "idle" | "loading" | "ready" | "empty" | "error";

interface WorkspaceContextValue {
  status: WorkspaceStatus;
  workspaces: WorkspaceSummary[];
  selectedWorkspaceId: string | null;
  selectedWorkspace: WorkspaceSummary | null;
  selectWorkspace: (workspaceId: string) => void;
  retry: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { status: authStatus, user } = useAuth();
  const queryClient = useQueryClient();
  const selectedWorkspaceId = useSyncExternalStore(
    subscribeToWorkspace,
    getSelectedWorkspaceId,
    getSelectedWorkspaceId,
  );

  const workspaceQuery = useQuery<WorkspaceSummary[]>({
    queryKey: ["workspaces", user?.id ?? "anonymous"],
    enabled: authStatus === "authenticated" && !!user?.id,
    queryFn: async () => {
      const response = await apiClient.get<WorkspaceDto[]>(
        "/api/v1/workspaces",
        { skipWorkspaceHeader: true },
      );
      return Array.isArray(response.data) ? response.data.map(mapWorkspaceSummary) : [];
    },
  });

  const workspaces = workspaceQuery.data ?? [];

  useEffect(() => {
    if (authStatus !== "authenticated") {
      clearWorkspaceSelection();
      return;
    }

    if (!workspaceQuery.data) return;

    const persisted = localStorage.getItem("workspaceId");
    if (!persisted || !isValidWorkspaceId(persisted)) {
      if (workspaces.length > 0 && selectedWorkspaceId !== workspaces[0].id) {
        setSelectedWorkspaceId(workspaces[0].id);
      } else if (workspaces.length === 0) {
        clearWorkspaceSelection();
      }
      return;
    }

    const accessible = workspaces.some((item) => item.id === persisted);
    if (accessible) {
      if (selectedWorkspaceId !== persisted) setSelectedWorkspaceId(persisted);
    } else {
      clearWorkspaceSelection();
    }
  }, [authStatus, selectedWorkspaceId, workspaceQuery.data, workspaces]);

  const selectWorkspace = useCallback(async (workspaceId: string) => {
    if (!isValidWorkspaceId(workspaceId) || !workspaces.some((item) => item.id === workspaceId)) return;
    if (workspaceId === getSelectedWorkspaceId()) return;

    await queryClient.cancelQueries({
      predicate: (query) => query.queryKey[0] !== "workspaces",
    });
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "workspaces" });
    setSelectedWorkspaceId(workspaceId);
  }, [queryClient, workspaces]);

  const status: WorkspaceStatus = authStatus !== "authenticated"
    ? "idle"
    : workspaceQuery.isPending
      ? "loading"
      : workspaceQuery.isError
        ? "error"
        : workspaces.length === 0
          ? "empty"
          : "ready";

  const value = useMemo<WorkspaceContextValue>(() => ({
    status,
    workspaces,
    selectedWorkspaceId,
    selectedWorkspace: workspaces.find((item) => item.id === selectedWorkspaceId) ?? null,
    selectWorkspace,
    retry: () => { void workspaceQuery.refetch(); },
  }), [selectWorkspace, selectedWorkspaceId, status, workspaceQuery, workspaces]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  const selectedWorkspaceId = useSyncExternalStore(
    subscribeToWorkspace,
    getSelectedWorkspaceId,
    getSelectedWorkspaceId,
  );
  if (context) return context;

  return {
    status: selectedWorkspaceId ? "ready" : "idle",
    workspaces: [],
    selectedWorkspaceId,
    selectedWorkspace: null,
    selectWorkspace: (workspaceId) => { setSelectedWorkspaceId(workspaceId); },
    retry: () => undefined,
  };
}
