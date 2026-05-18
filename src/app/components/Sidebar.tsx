import { Link, useLocation } from "react-router";
import { Server, Network, Workflow, Activity } from "lucide-react";

const navItems = [
  { name: "Infrastructure Inventory", path: "/", icon: <Server size={20} /> },
  { name: "Topology Map", path: "/topology", icon: <Network size={20} /> },
  { name: "Dependency Manager", path: "/dependency-manager", icon: <Workflow size={20} /> },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-[260px] bg-sidebar border-r border-sidebar-border flex flex-col z-20 relative shrink-0">
      <div className="p-6 border-b border-sidebar-border flex items-center gap-3">
        <div className="bg-tertiary/20 p-2 rounded-lg border border-tertiary/30">
          <Activity className="text-tertiary" size={24} />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-primary font-display">
          Audit<span className="text-tertiary">Node</span>
        </h1>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (location.pathname === "/inventory" && item.path === "/");
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-tertiary/10 text-tertiary border border-tertiary/20 shadow-[0_0_15px_rgba(255,77,126,0.1)]"
                  : "text-secondary hover:text-primary hover:bg-surface/50"
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-secondary font-label text-center">System Version: v1.0-MVP</p>
      </div>
    </aside>
  );
}
