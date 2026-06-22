import { useState, useRef, useEffect } from "react";
import { Briefcase, ChevronDown, Check, Search } from "lucide-react";
import { useHeader } from "../hooks/useHeader";
import { useWorkspaceStore, Workspace } from "../hooks/useWorkspaceStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../shared/api/client";

export function Topbar() {
  const { breadcrumbs } = useHeader();
  const queryClient = useQueryClient();

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
    <header className="h-16 bg-panel/70 backdrop-blur-md border-b border-border px-6 flex items-center justify-between z-20 shrink-0">
      <div className="flex min-w-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <div key={index} className="flex items-center gap-2">
              <span className={`truncate ${isLast ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {crumb}
              </span>
              {!isLast && <span className="text-border">/</span>}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        {/* Workspace Switcher */}
        <div className="relative" ref={workspaceDropdownRef}>
          <button
            onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
            disabled={isLoading}
            className="hidden md:flex items-center gap-2 h-9 rounded-md border border-border bg-surface px-3 text-xs text-muted-foreground hover:border-primary/40 transition-colors"
          >
            <Briefcase className="size-3.5 text-primary" />
            {isLoading ? "Loading..." : activeWorkspace?.name || "Default Workspace"}
            <ChevronDown className={`size-3.5 transition-transform duration-200 ${isWorkspaceOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Workspace Dropdown */}
          {isWorkspaceOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-border/60 bg-background/30">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Switch Workspace</p>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-1.5">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleWorkspaceChange(ws)}
                    className={`flex items-center justify-between w-full px-3 py-3 rounded-lg text-left transition-colors group ${
                      activeWorkspace?.id === ws.id 
                        ? "bg-primary/10 text-primary" 
                        : "text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold truncate">{ws.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{ws.description}</p>
                    </div>
                    {activeWorkspace?.id === ws.id && <Check size={16} className="shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Global Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            placeholder="Search infrastructure…"
            className="h-9 w-56 rounded-md border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>
    </header>
  );
}
