import { User } from "lucide-react";

export function Topbar() {
  return (
    <header className="h-20 bg-background/80 backdrop-blur-md border-b border-border px-8 flex items-center justify-end z-20 shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-primary">Admin User</p>
            <p className="text-xs text-secondary font-label">Infrastructure Manager</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-surface border-2 border-border flex items-center justify-center shadow-lg">
            <User size={18} className="text-primary" />
          </div>
        </div>
      </div>
    </header>
  );
}
