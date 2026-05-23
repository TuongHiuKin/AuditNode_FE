import { useState } from "react";
import {
  Search,
  User,
  Plus,
  Download,
  ChevronDown,
  Image as ImageIcon,
  FileText,
} from "lucide-react";

interface TopbarProps {
  onOpenModal: () => void;
}

export function Topbar({ onOpenModal }: TopbarProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);

  return (
    <header className="h-20 bg-background/80 backdrop-blur-md border-b border-border px-8 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-4">
        <div className="relative w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={18} />
          <input
            type="text"
            placeholder="Search IP, App, or Server..."
            className="w-full bg-surface border border-border text-primary rounded-full py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-tertiary/50 focus:border-tertiary transition-all placeholder:text-secondary/50 text-sm"
          />
        </div>

        {/* Export View Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="flex items-center gap-2 bg-surface hover:bg-surface/80 border border-border px-4 py-2 rounded-lg text-sm font-medium text-primary transition-colors shadow-sm"
          >
            <Download size={16} className="text-tertiary" />
            Export View
            <ChevronDown size={14} className="text-secondary" />
          </button>
          {isExportOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
              <div className="absolute left-0 top-full mt-2 w-56 bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => setIsExportOpen(false)}
                  className="flex items-center w-full text-left px-4 py-3 hover:bg-background text-sm text-primary transition-colors border-b border-border/50"
                >
                  <ImageIcon size={16} className="mr-3 text-tertiary" />
                  Export as PNG Image
                </button>
                <button
                  onClick={() => setIsExportOpen(false)}
                  className="flex items-center w-full text-left px-4 py-3 hover:bg-background text-sm text-primary transition-colors border-b border-border/50"
                >
                  <ImageIcon size={16} className="mr-3 text-tertiary" />
                  Export as JPEG
                </button>
                <button
                  onClick={() => setIsExportOpen(false)}
                  className="flex items-center w-full text-left px-4 py-3 hover:bg-background text-sm text-primary transition-colors"
                >
                  <FileText size={16} className="mr-3 text-tertiary" />
                  Export Raw Data (.csv)
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={onOpenModal}
          className="bg-tertiary hover:bg-tertiary/90 text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(255,77,126,0.3)]"
        >
          <Plus size={18} /> Register New Entity
        </button>

        <div className="h-8 w-px bg-border" />

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
