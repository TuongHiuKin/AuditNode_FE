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
    <aside className="w-[260px] bg-sidebar border-r border-slate-900 flex flex-col z-20 relative shrink-0">
      <div className="p-6 border-b border-slate-900 flex items-center gap-3">
        <div className="bg-tertiary/10 p-2 rounded-lg border border-tertiary/20">
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
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-slate-900/50 text-tertiary border border-slate-800 shadow-[0_0_10px_rgba(122,134,153,0.05)]"
                  : "text-secondary hover:text-primary hover:bg-slate-900/30"
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-900">
        <p className="text-[10px] text-slate-500 font-mono text-center uppercase tracking-widest">v1.0-MVP</p>
      </div>
    </aside>
  );
}
