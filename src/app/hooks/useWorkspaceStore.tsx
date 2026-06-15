import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Workspace {
  id: string;
  name: string;
  description: string;
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setWorkspaces: (list: Workspace[]) => void;
  setActiveWorkspace: (workspace: Workspace) => void;
}

const WorkspaceContext = createContext<WorkspaceState | undefined>(undefined);

// A singleton-like helper to allow non-React files (like axios client) to access the active ID
let currentWorkspaceId: string | null = null;
export const getActiveWorkspaceId = () => currentWorkspaceId;

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaces, setWorkspacesState] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);

  // Synchronize the external getter whenever the active workspace changes
  useEffect(() => {
    currentWorkspaceId = activeWorkspace?.id || null;
  }, [activeWorkspace]);

  const setWorkspaces = (list: Workspace[]) => {
    setWorkspacesState(list);
    // Auto-select first workspace if none selected
    if (list.length > 0 && !activeWorkspace) {
      setActiveWorkspaceState(list[0]);
    }
  };

  const setActiveWorkspace = (workspace: Workspace) => {
    setActiveWorkspaceState(workspace);
  };

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, setWorkspaces, setActiveWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspaceStore = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspaceStore must be used within a WorkspaceProvider');
  }
  return context;
};
