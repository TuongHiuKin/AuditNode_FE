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
  setActiveWorkspace: (workspace: Workspace | null) => void;
}

const WorkspaceContext = createContext<WorkspaceState | undefined>(undefined);

// A singleton-like helper to allow non-React files (like axios client) to access the active ID
let currentWorkspaceId: string | null = null;
export const getActiveWorkspaceId = () => currentWorkspaceId;

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaces, setWorkspacesState] = useState<Workspace[]>([]);
  
  // Initialize state eagerly from localStorage
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(() => {
    try {
      const saved = localStorage.getItem('auditNode_activeWorkspace');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Synchronize the external getter whenever the active workspace changes
  useEffect(() => {
    currentWorkspaceId = activeWorkspace?.id || null;
  }, [activeWorkspace]);

  const setActiveWorkspace = (workspace: Workspace | null) => {
    setActiveWorkspaceState(workspace);
    if (workspace) {
      localStorage.setItem('auditNode_activeWorkspace', JSON.stringify(workspace));
    } else {
      localStorage.removeItem('auditNode_activeWorkspace');
    }
  };

  const setWorkspaces = (list: Workspace[]) => {
    setWorkspacesState(list);
    // Auto-select first workspace if none selected
    if (!activeWorkspace && list.length > 0) {
      setActiveWorkspace(list[0]);
    }
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
