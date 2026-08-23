import { LockKeyhole } from "lucide-react";
export function RestrictedNode({ data }: { data: { label?: string } }) {
  return <div aria-label="Restricted external resource" className="flex min-w-48 items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted-foreground shadow-lg"><LockKeyhole className="size-4 text-warning" /><span>{data.label || "External Resource (Restricted)"}</span></div>;
}
