import { Button } from "../ui/Button";
import { useWorkspace } from "./WorkspaceContext";

export function WorkspaceSelector() {
  const workspace = useWorkspace();

  if (workspace.status === "idle" || workspace.status === "loading") {
    return <span role="status" className="text-xs text-muted-foreground">Loading workspaces...</span>;
  }

  if (workspace.status === "error") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-danger">Workspaces unavailable</span>
        <Button variant="outline" className="h-[34px] px-3" onClick={workspace.retry}>Retry</Button>
      </div>
    );
  }

  const owned = workspace.workspaces.filter((item) => item.relationship === "owner" || item.relationship === "admin");
  const shared = workspace.workspaces.filter((item) => item.relationship === "shared");
  return <select aria-label="Workspace" value={workspace.selectedWorkspaceId ?? ""}
    onChange={(event) => workspace.selectWorkspace(event.target.value)} disabled={workspace.workspaces.length === 0}
    className="h-[34px] min-w-48 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30">
    {workspace.workspaces.length === 0 && <option value="">No workspaces available</option>}
    {owned.length > 0 && <optgroup label="My Workspaces">{owned.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.effectiveRole}</option>)}</optgroup>}
    {shared.length > 0 && <optgroup label="Shared with Me">{shared.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.effectiveRole}</option>)}</optgroup>}
  </select>;
}
