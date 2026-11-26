import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Globe } from "lucide-react";
import type { ExternalServiceNodeData } from "@/features/dependency-graph/types";

/**
 * A third-party service on the dependency canvas.
 *
 * Visually distinct from AppNode on purpose: an external dependency crosses the
 * owner's infrastructure boundary, and an operator scanning the graph needs to see
 * that at a glance rather than reading a label.
 *
 * Only a source handle is exposed. Nothing may depend *on* an external service's
 * "port" here, because the canvas models direction as caller -> callee and an
 * external service is always the callee.
 */
function ExternalServiceNodeComponent({ data, selected }: NodeProps) {
  const node = data as unknown as ExternalServiceNodeData;
  const service = node.service;

  return (
    <div
      className={`w-[220px] rounded-xl border-2 border-dashed px-3 py-2.5 shadow-sm transition-colors ${
        selected ? "border-primary bg-primary/10" : "border-primary/50 bg-primary/5"
      }`}
      data-testid="external-service-node"
    >
      <div className="flex items-start gap-2">
        <Globe size={15} className="mt-0.5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{service.name}</p>
          <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
            {service.kind}
            {service.environment ? ` · ${service.environment}` : ""}
          </p>
          {(service.endpoint || service.port) && (
            <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
              {service.endpoint ?? "—"}
              {service.port ? `:${service.port}` : ""}
            </p>
          )}
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-primary" />
    </div>
  );
}

export const ExternalServiceNode = memo(ExternalServiceNodeComponent);
