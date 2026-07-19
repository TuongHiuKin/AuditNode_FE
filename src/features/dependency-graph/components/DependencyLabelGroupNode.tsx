import { memo } from "react";
import { Tags } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import type { DependencyLabelGroupNode as DependencyLabelGroupNodeType } from "../types";

export const DependencyLabelGroupNode = memo(
  ({ data }: NodeProps<DependencyLabelGroupNodeType>) => (
    <div className="pointer-events-none relative size-full rounded-xl border border-dashed border-border bg-surface/30">
      <div
        className="dependency-label-drag-handle pointer-events-auto absolute -top-3 left-4 flex cursor-grab items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 shadow-sm active:cursor-grabbing"
        title="Drag to reposition this label frame"
      >
        <Tags size={12} className="text-primary" />
        <span className="font-label text-[10px] font-bold uppercase tracking-widest text-foreground">
          <span className="text-muted-foreground">{data.label.key}:</span>{" "}
          {data.label.value}
        </span>
        <span className="rounded bg-surface px-1.5 py-0.5 font-label text-[9px] text-muted-foreground">
          {data.serverCount} server{data.serverCount === 1 ? "" : "s"}
        </span>
        <span className="rounded bg-surface px-1.5 py-0.5 font-label text-[9px] text-muted-foreground">
          {data.applicationCount} app{data.applicationCount === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  ),
);

DependencyLabelGroupNode.displayName = "DependencyLabelGroupNode";
