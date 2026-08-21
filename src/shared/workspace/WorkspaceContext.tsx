import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/client";
import { useAuth } from "../auth/AuthContext";
import {
  clearWorkspaceSelection,
  getSelectedWorkspaceId,
  isValidWorkspaceId,
  setSelectedWorkspaceId,
  subscribeToWorkspace,
} from "./workspaceStore";

export interface WorkspaceSummary {
  id: string;
  name: string;
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
      const response = await apiClient.get<WorkspaceSummary[]>(
        "/api/v1/workspaces",
        { skipWorkspaceHeader: true },
      );
      return Array.isArray(response.data) ? response.data : [];
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

  const selectWorkspace = useCallback((workspaceId: string) => {
    if (!isValidWorkspaceId(workspaceId) || !workspaces.some((item) => item.id === workspaceId)) return;
    if (workspaceId === getSelectedWorkspaceId()) return;

    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== "workspaces",
    });
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
