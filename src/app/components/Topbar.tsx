
import { useHeader } from "../hooks/useHeader";
import { WorkspaceSelector } from "../../shared/workspace/WorkspaceSelector";
import { WorkspaceScopeBanner } from "../../shared/workspace/WorkspaceScopeBanner";
import { useState } from "react";
import { Share2 } from "lucide-react";
import { useWorkspaceCapabilities } from "../../shared/workspace/useWorkspaceCapabilities";
import { ShareWorkspaceModal } from "../../features/workspace-sharing/components/ShareWorkspaceModal";

export function Topbar() {
  const { breadcrumbs } = useHeader();
  const [shareOpen, setShareOpen] = useState(false);
  const { canManageShares } = useWorkspaceCapabilities();

  return (
    <div className="z-20 shrink-0">
    <header className="h-16 bg-panel/70 backdrop-blur-md border-b border-border px-6 flex items-center justify-between">
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
        {canManageShares && <button onClick={() => setShareOpen(true)} className="flex h-[34px] items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/20"><Share2 size={14} />Share</button>}
        <WorkspaceSelector />
      </div>
    </header>
    <WorkspaceScopeBanner />
    {canManageShares && <ShareWorkspaceModal open={shareOpen} onOpenChange={setShareOpen} />}
    </div>
  );
}
