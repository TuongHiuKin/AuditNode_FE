import { useWorkspace } from "./WorkspaceContext";

export function WorkspaceScopeBanner() {
  const { selectedWorkspace } = useWorkspace();
  if (!selectedWorkspace?.scope || selectedWorkspace.scope.mode === "all") return null;
  const targets = selectedWorkspace.scope.mode === "labels"
    ? selectedWorkspace.scope.labels
    : selectedWorkspace.scope.frames;
  const names = targets.map((target) => target.displayName || target.id).join(", ");
  return (
    <div role="status" className="border-b border-primary/20 bg-primary/10 px-6 py-2 text-xs text-foreground">
      Shared scope active: <span className="font-semibold capitalize">{selectedWorkspace.scope.mode}</span>
      {names ? ` · ${names}` : ""}
    </div>
  );
}
