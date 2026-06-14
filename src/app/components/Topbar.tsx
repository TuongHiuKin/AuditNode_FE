import { User, LogOut } from "lucide-react";
import { useHeader } from "../hooks/useHeader";
import { getUsername, doLogout } from "../../services/keycloakService";

export function Topbar() {
  const { title, subtitle, icon } = useHeader();
  const username = getUsername();

  return (
    <header className="h-20 bg-background/80 backdrop-blur-md border-b border-border px-8 flex items-center justify-between z-20 shrink-0">
      {/* Left side: Dynamic Title */}
      <div className="flex flex-col">
        {title && (
          <h1 className="text-xl font-bold text-primary flex items-center gap-2 font-display">
            {icon && <span className="text-secondary">{icon}</span>}
            {title}
          </h1>
        )}
        {subtitle && (
          <span className="text-xs text-secondary font-label">{subtitle}</span>
        )}
      </div>

      {/* Right side: User Profile */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-primary">{username}</p>
            <p className="text-xs text-secondary font-label">Authenticated User</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-surface border-2 border-border flex items-center justify-center shadow-lg group relative cursor-pointer" title="User Profile">
            <User size={18} className="text-primary" />
          </div>
          <button 
            onClick={doLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
            <span className="hidden lg:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
