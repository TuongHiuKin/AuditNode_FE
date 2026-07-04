import { ReactNode } from "react";
import { X, Info } from "lucide-react";
import { cn } from "./Button"; 

export interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SlidePanel({ isOpen, onClose, title, icon = <Info size={16} className="text-primary" />, children, className }: SlidePanelProps) {
  return (
    <div
      className={cn(
        "flex-shrink-0 h-full overflow-hidden bg-panel shadow-xl transition-all duration-300 ease-in-out z-20 flex flex-col",
        isOpen ? "w-80 md:w-96 border-l border-border opacity-100" : "w-0 border-l-0 opacity-0",
        className
      )}
    >
      <div className="w-80 md:w-96 min-w-[20rem] md:min-w-[24rem] flex flex-col h-full">
        <div className="p-5 border-b border-border bg-panel shrink-0 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2 font-display uppercase tracking-tight">
            {icon} {title}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {children}
        </div>
      </div>
    </div>
  );
}
