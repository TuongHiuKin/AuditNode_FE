import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Server, Network, Workflow, Activity, ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";
import { getUsername } from "../../services/keycloakService";

const navGroups = [
  {
    group: "Infrastructure",
    items: [
      { name: "Inventory", path: "/inventory", icon: Server },
      { name: "Datacenters", path: "/datacenters", icon: Server },
      { name: "Topology Map", path: "/topology", icon: Network },
      { name: "Dependencies", path: "/dependency-manager", icon: Workflow },
    ],
  },
];

function getInitials(username: string): string {
  return username
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const username = getUsername();
  const initials = getInitials(username);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } shrink-0 border-r border-border bg-sidebar flex flex-col z-20 relative transition-[width] duration-300 overflow-hidden h-full`}
    >
      {/* Logo */}
      <div
        className={`h-16 flex items-center gap-3 px-4 border-b border-border shrink-0 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="size-9 shrink-0 rounded-lg bg-primary grid place-items-center shadow-[0_0_18px_rgba(229,67,95,0.35)]">
          <Activity className="size-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-display text-lg font-bold tracking-tight text-foreground whitespace-nowrap">
            Audit<span className="text-primary">Node</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {navGroups.map((section) => (
          <div key={section.group}>
            {!collapsed && (
              <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {section.group}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.name : undefined}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                    } ${collapsed ? "justify-center" : ""}`}
                  >
                    <Icon className="size-4 shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: user info + collapse button */}
      <div className="border-t border-border p-3 shrink-0 relative flex flex-col items-center" ref={profileRef}>
        <button 
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          title={collapsed ? username : undefined}
          className={`w-full flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-3 rounded-md py-2 hover:bg-surface-hover transition-colors text-left ${collapsed ? "px-0" : "px-2"}`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="size-8 shrink-0 rounded-full bg-surface ring-1 ring-border grid place-items-center text-xs font-semibold text-muted-foreground select-none">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 text-xs">
                <div className="truncate font-semibold text-foreground">{username}</div>
                <div className="truncate text-muted-foreground">Enterprise Plan</div>
              </div>
            )}
          </div>
        </button>

        {/* Profile Dropdown */}
        {isProfileOpen && (
          <div className={`absolute bottom-[100%] ${collapsed ? "left-12 w-[180px]" : "left-3 w-[calc(100%-24px)]"} mb-2 bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150`}>
            <button
              onClick={() => {
                localStorage.removeItem("accessToken");
                navigate("/login", { replace: true });
              }}
              className="flex items-center w-full gap-3 px-4 py-3 text-sm text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut size={16} />
              <span className="font-semibold">Sign Out</span>
            </button>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`mt-1 flex w-full items-center justify-center gap-2 rounded-md py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors ${collapsed ? "px-0" : "px-3"}`}
        >
          {collapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <>
              <ChevronsLeft className="size-4" />
              Collapse
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
