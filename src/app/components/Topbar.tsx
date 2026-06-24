
import { useHeader } from "../hooks/useHeader";

export function Topbar() {
  const { breadcrumbs } = useHeader();

  return (
    <header className="h-16 bg-panel/70 backdrop-blur-md border-b border-border px-6 flex items-center justify-between z-20 shrink-0">
      <div className="flex min-w-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <div key={index} className="flex items-center gap-2">
              <span className={`truncate ${isLast ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {crumb}
              </span>
              {!isLast && <span className="text-border">/</span>}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4">

      </div>
    </header>
  );
}
