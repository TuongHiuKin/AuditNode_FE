import { ReactNode } from "react";
import { cn } from "./Button";

export function DataSection({ title, children, className }: { title: string, children: ReactNode, className?: string }) {
  return (
    <div className={className}>
      <h3 className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-widest mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function DataCard({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <div className={cn("bg-surface border border-border rounded-lg p-3 space-y-2", className)}>
      {children}
    </div>
  );
}

export function DataRow({ label, value, valueClassName }: { label: string, value: ReactNode, valueClassName?: string }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-[10px] text-muted-foreground uppercase font-medium shrink-0">{label}</span>
      <span className={cn("text-sm font-medium text-foreground text-right", valueClassName)}>
        {value}
      </span>
    </div>
  );
}
