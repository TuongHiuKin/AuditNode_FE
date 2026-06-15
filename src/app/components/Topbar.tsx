import { useState, useRef, useEffect } from "react";
import { User, LogOut } from "lucide-react";
import { useHeader } from "../hooks/useHeader";
import { getUsername, doLogout } from "../../services/keycloakService";

export function Topbar() {
  const { title, subtitle, icon } = useHeader();
  const username = getUsername();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

      {/* Right side: User Profile (merged with Logout) */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface/60 transition-colors cursor-pointer group"
        >
          {/* Name + role */}
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-primary leading-tight">{username}</p>
            <p className="text-xs text-secondary font-label">Authenticated User</p>
          </div>

          {/* Avatar */}
          <div className="h-9 w-9 rounded-full bg-surface border-2 border-border flex items-center justify-center shadow-lg">
            <User size={17} className="text-primary" />
          </div>

        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* User info header */}
            <div className="px-4 py-3 border-b border-border/60">
              <p className="text-sm font-semibold text-primary truncate">{username}</p>
              <p className="text-xs text-secondary font-label mt-0.5">Authenticated User</p>
            </div>

            {/* Logout action */}
            <button
              onClick={() => { setIsOpen(false); doLogout(); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
