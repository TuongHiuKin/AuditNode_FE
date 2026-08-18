import { Button } from "../ui/Button";
import { Dropdown } from "../ui/Dropdown";
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

  if (workspace.status === "empty") {
    return <span className="text-xs text-muted-foreground">No workspaces available</span>;
  }

  return (
    <Dropdown
      label="Workspace"
      value={workspace.selectedWorkspaceId ?? ""}
      options={[
        { value: "", label: "Select workspace" },
        ...workspace.workspaces.map((item) => ({ value: item.id, label: item.name })),
      ]}
      onChange={workspace.selectWorkspace}
    />
  );
}
