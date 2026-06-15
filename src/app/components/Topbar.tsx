import { useState, useRef, useEffect } from "react";
import { User, LogOut, Briefcase, ChevronDown, Check } from "lucide-react";
import { useHeader } from "../hooks/useHeader";
import { getUsername, doLogout } from "../../services/keycloakService";
import { useWorkspaceStore, Workspace } from "../hooks/useWorkspaceStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../shared/api/client";

export function Topbar() {
  const { title, subtitle, icon } = useHeader();
  const username = getUsername();
  const queryClient = useQueryClient();
  
  // User Dropdown State
  const [isUserOpen, setIsUserOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Workspace State & Dropdown
  const { workspaces, activeWorkspace, setWorkspaces, setActiveWorkspace } = useWorkspaceStore();
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const workspaceDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch Workspaces
  const { data: fetchedWorkspaces, isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const response = await apiClient.get<Workspace[]>("/api/v1/workspaces");
      return response.data;
    }
  });

  // Sync workspaces to store
  useEffect(() => {
    if (fetchedWorkspaces && fetchedWorkspaces.length > 0) {
      setWorkspaces(fetchedWorkspaces);
    }
  }, [fetchedWorkspaces, setWorkspaces]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setIsUserOpen(false);
      }
      if (workspaceDropdownRef.current && !workspaceDropdownRef.current.contains(e.target as Node)) {
        setIsWorkspaceOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleWorkspaceChange = (ws: Workspace) => {
    setActiveWorkspace(ws);
    setIsWorkspaceOpen(false);
    // Invalidate all queries to trigger a clean re-fetch under new workspace context
    queryClient.invalidateQueries();
  };

  return (
    <header className="h-20 bg-background/80 backdrop-blur-md border-b border-border px-8 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-4">
        {icon && (
          <div className="h-10 w-10 rounded-xl bg-surface border border-border flex items-center justify-center text-tertiary shadow-sm">
            {icon}
          </div>
        )}
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-primary leading-tight font-display">{title}</h2>
          {subtitle && <p className="text-xs text-secondary font-label mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Workspace Switcher */}
        <div className="relative" ref={workspaceDropdownRef}>
          <button
            onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
            disabled={isLoading}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface/40 hover:bg-surface/80 border border-border transition-all cursor-pointer group min-w-[200px] justify-between"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-8 w-8 rounded-lg bg-tertiary/10 border border-tertiary/20 flex items-center justify-center shrink-0">
                <Briefcase size={16} className="text-tertiary" />
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-[10px] text-secondary font-bold uppercase tracking-wider leading-none mb-1">Active Workspace</p>
                <p className="text-sm font-semibold text-primary truncate max-w-[120px]">
                  {isLoading ? "Loading..." : activeWorkspace?.name || "No Workspace"}
                </p>
              </div>
            </div>
            <ChevronDown size={16} className={`text-secondary transition-transform duration-200 ${isWorkspaceOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Workspace Dropdown */}
          {isWorkspaceOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-border/60 bg-background/30">
                <p className="text-xs font-bold text-secondary uppercase tracking-widest">Switch Workspace</p>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-1.5">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleWorkspaceChange(ws)}
                    className={`flex items-center justify-between w-full px-3 py-3 rounded-lg text-left transition-colors group ${
                      activeWorkspace?.id === ws.id 
                        ? "bg-tertiary/10 text-tertiary" 
                        : "text-primary hover:bg-background"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold truncate">{ws.name}</p>
                      <p className="text-[11px] text-secondary truncate mt-0.5">{ws.description}</p>
                    </div>
                    {activeWorkspace?.id === ws.id && <Check size={16} className="shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-[1px] bg-border mx-1" />

        {/* User Profile */}
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => setIsUserOpen(!isUserOpen)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface/60 transition-colors cursor-pointer group"
          >
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-primary leading-tight">{username}</p>
              <p className="text-xs text-secondary font-label">Authenticated User</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-surface border-2 border-border flex items-center justify-center shadow-lg">
              <User size={17} className="text-primary" />
            </div>
          </button>

          {/* User Dropdown */}
          {isUserOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-border/60">
                <p className="text-sm font-semibold text-primary truncate">{username}</p>
                <p className="text-xs text-secondary font-label mt-0.5">Authenticated User</p>
              </div>
              <button
                onClick={() => { setIsUserOpen(false); doLogout(); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
