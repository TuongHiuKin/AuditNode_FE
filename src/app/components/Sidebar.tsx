import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router";
import { Server, Network, Workflow, Activity, ChevronsLeft, ChevronsRight, LogOut, Users } from "lucide-react";
import { useRBAC } from "../../shared/auth/useRBAC";
import { useAuth } from "../../shared/auth/AuthContext";

const navGroups = [
  {
    group: "Infrastructure",
    items: [
      { name: "Inventory", path: "/inventory", icon: Server },
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
  const { user, logout } = useAuth();
  const { isSystemAdmin } = useRBAC();
  const asideRef = useRef<HTMLElement>(null);
  const profileContainerRef = useRef<HTMLDivElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ left: 0, bottom: 0, width: 0 });
  const username = user?.username ?? "User";
  const initials = getInitials(username);

  const updatePosition = useCallback(() => {
    if (!avatarButtonRef.current) return;
    const avatarRect = avatarButtonRef.current.getBoundingClientRect();
    const asideRect = asideRef.current?.getBoundingClientRect();

    if (collapsed && asideRect) {
      // When collapsed: popup floats cleanly to the right of the sidebar border line with an 8px margin
      setMenuPos({
        left: asideRect.right + 8,
        bottom: Math.max(12, window.innerHeight - avatarRect.bottom),
        width: 200,
      });
    } else {
      // When expanded: popup floats directly above the user profile card
      setMenuPos({
        left: avatarRect.left,
        bottom: window.innerHeight - avatarRect.top + 8,
        width: avatarRect.width,
      });
    }
  }, [collapsed]);

  useEffect(() => {
    if (!isProfileOpen) return;
    updatePosition();

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        profileContainerRef.current && !profileContainerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsProfileOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsProfileOpen(false);
    }

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileOpen, updatePosition]);

  return (
    <aside
      ref={asideRef}
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
        {isSystemAdmin && <div><div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Administration</div><Link to="/admin/users" className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${location.pathname.startsWith("/admin/users") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"}`}><Users className="size-4" />{!collapsed && <span>Users</span>}</Link></div>}
      </nav>

      {/* Footer: user info + collapse button */}
      <div className="border-t border-border p-3 shrink-0 relative flex flex-col items-center" ref={profileContainerRef}>
        <button 
          ref={avatarButtonRef}
          onClick={() => {
            setIsProfileOpen((prev) => !prev);
          }}
          data-testid="sidebar-profile-btn"
          aria-label={username}
          title={collapsed ? username : undefined}
          className={`w-full flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-3 rounded-md py-2 hover:bg-surface-hover transition-colors text-left cursor-pointer ${collapsed ? "px-0" : "px-2"}`}
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

        {/* Profile Dropdown rendered via portal to prevent overflow-hidden clipping */}
        {isProfileOpen && createPortal(
          <div
            ref={menuRef}
            data-testid="sidebar-profile-menu"
            style={{
              position: "fixed",
              left: `${menuPos.left}px`,
              bottom: `${menuPos.bottom}px`,
              width: `${menuPos.width}px`,
            }}
            className="bg-surface/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden z-[9999] animate-in fade-in zoom-in-95 duration-150 p-1.5"
          >
            {collapsed && (
              <div className="px-3 py-2.5 border-b border-border/80 mb-1 flex items-center gap-2.5">
                <div className="size-7 shrink-0 rounded-full bg-surface-hover ring-1 ring-border grid place-items-center text-xs font-semibold text-foreground select-none">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">{username}</p>
                  <p className="text-[10px] text-muted-foreground truncate">Enterprise Plan</p>
                </div>
              </div>
            )}
            <button
              data-testid="sidebar-sign-out-btn"
              onClick={async () => {
                setIsProfileOpen(false);
                try {
                  await logout();
                } finally {
                  navigate("/login", { replace: true });
                }
              }}
              className="flex items-center w-full gap-2.5 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer group"
            >
              <LogOut size={15} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Sign Out</span>
            </button>
          </div>,
          document.body
        )}

        <button
          onClick={() => {
            setIsProfileOpen(false);
            setCollapsed((c) => !c);
          }}
          data-testid="sidebar-collapse-btn"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`mt-1 flex w-full items-center justify-center gap-2 rounded-md py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer ${collapsed ? "px-0" : "px-3"}`}
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
