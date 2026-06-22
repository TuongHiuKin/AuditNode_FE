import { memo } from "react";
import {
  Handle,
  Position,
  NodeResizer,
  type NodeProps,
  useReactFlow,
} from "@xyflow/react";
import { Globe, Maximize, ShieldCheck } from "lucide-react";
import type { Node } from "@xyflow/react";

// ─── Data contract ──────────────────────────────────────────────────────────────
export interface ZoneNodeData extends Record<string, unknown> {
  /** Display name shown in the header badge (e.g. "DMZ", "Prod-US-East") */
  label: string;
  /** Optional subtitle / metadata shown beside the label */
  subtitle?: string;
  /** Visual accent — maps to a curated palette below. Defaults to "blue" */
  variant?: "blue" | "amber" | "emerald" | "violet" | "rose";
  /** Persisted dimensions so the node restores its size on reload */
  width?: number;
  height?: number;
}

export type ZoneNode = Node<ZoneNodeData, "zoneNode">;

// ─── Variant palette ─────────────────────────────────────────────────────────────
const VARIANTS: Record<
  NonNullable<ZoneNodeData["variant"]>,
  {
    border: string;
    borderSelected: string;
    bg: string;
    bgHover: string;
    badge: string;
    badgeBorder: string;
    iconColor: string;
    resizerHandle: string;
    miniMapColor: string;
  }
> = {
  blue: {
    border: "border-sky-800/50",
    borderSelected: "border-sky-500",
    bg: "bg-sky-950/15",
    bgHover: "hover:bg-sky-950/25",
    badge: "bg-sky-950/80",
    badgeBorder: "border-sky-700/60",
    iconColor: "text-sky-400",
    resizerHandle: "#0ea5e9",
    miniMapColor: "#0c4a6e",
  },
  amber: {
    border: "border-amber-800/50",
    borderSelected: "border-amber-500",
    bg: "bg-amber-950/15",
    bgHover: "hover:bg-amber-950/25",
    badge: "bg-amber-950/80",
    badgeBorder: "border-amber-700/60",
    iconColor: "text-amber-400",
    resizerHandle: "#f59e0b",
    miniMapColor: "#78350f",
  },
  emerald: {
    border: "border-emerald-800/50",
    borderSelected: "border-emerald-500",
    bg: "bg-emerald-950/15",
    bgHover: "hover:bg-emerald-950/25",
    badge: "bg-emerald-950/80",
    badgeBorder: "border-emerald-700/60",
    iconColor: "text-emerald-400",
    resizerHandle: "#10b981",
    miniMapColor: "#064e3b",
  },
  violet: {
    border: "border-violet-800/50",
    borderSelected: "border-violet-500",
    bg: "bg-violet-950/15",
    bgHover: "hover:bg-violet-950/25",
    badge: "bg-violet-950/80",
    badgeBorder: "border-violet-700/60",
    iconColor: "text-violet-400",
    resizerHandle: "#8b5cf6",
    miniMapColor: "#4c1d95",
  },
  rose: {
    border: "border-rose-800/50",
    borderSelected: "border-rose-500",
    bg: "bg-rose-950/15",
    bgHover: "hover:bg-rose-950/25",
    badge: "bg-rose-950/80",
    badgeBorder: "border-rose-700/60",
    iconColor: "text-rose-400",
    resizerHandle: "#f43f5e",
    miniMapColor: "#881337",
  },
};

// ─── Component ───────────────────────────────────────────────────────────────────
const ZoneNode = ({ id, data, selected, width, height }: NodeProps<ZoneNode>) => {
  const { getNodes, setNodes } = useReactFlow();
  const v = VARIANTS[data.variant ?? "blue"];

  // ── Auto-fit: resize the zone to snugly wrap all child nodes ──
  const handleAutoFit = (e: React.MouseEvent) => {
    e.stopPropagation();

    const children = getNodes().filter((n) => n.parentId === id);
    if (children.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    children.forEach((node) => {
      const { x, y } = node.position;
      const w = node.measured?.width ?? 240;
      const h = node.measured?.height ?? 44;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    const pad = 40;
    const topPad = 60; // header clearance

    const newWidth = Math.max(maxX + pad, 280);
    const newHeight = Math.max(maxY + pad, 250);

    const offsetX = minX < pad ? pad - minX : 0;
    const offsetY = minY < topPad ? topPad - minY : 0;

    setNodes((nodes) =>
      nodes.map((n) => {
        if (n.parentId === id) {
          return {
            ...n,
            position: {
              x: n.position.x + offsetX,
              y: n.position.y + offsetY,
            },
          };
        }
        if (n.id === id) {
          return {
            ...n,
            style: { ...n.style, width: newWidth, height: newHeight },
            data: { ...n.data, width: newWidth, height: newHeight },
          };
        }
        return n;
      })
    );
  };

  return (
    <div
      className={[
        "border-2 border-dashed rounded-2xl transition-all duration-200 ease-in-out relative flex flex-col",
        selected
          ? `${v.borderSelected} ${v.bg} shadow-[0_0_30px_rgba(255,255,255,0.04)]`
          : `${v.border} ${v.bg} ${v.bgHover}`,
      ].join(" ")}
      style={{
        width: width ? `${width}px` : data.width ? `${data.width}px` : "320px",
        height: height ? `${height}px` : data.height ? `${data.height}px` : "280px",
      }}
    >
      {/* ── Resizer ── */}
      <NodeResizer
        isVisible={selected}
        minWidth={250}
        minHeight={250}
        lineStyle={{ border: "none" }}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: "2px",
          background: v.resizerHandle,
          border: "none",
          margin: 0,
        }}
      />

      {/* ── Header badge (floating above the border) ── */}
      <div className="absolute -top-3.5 left-4 flex items-center gap-2 z-10">
        {/* Icon chip */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border shadow-sm backdrop-blur-sm ${v.badge} ${v.badgeBorder}`}
        >
          <ShieldCheck size={13} className={v.iconColor} />
          <span className="text-[11px] font-bold font-display text-foreground uppercase tracking-wide whitespace-nowrap">
            {data.label}
          </span>
        </div>

        {/* Optional subtitle pill */}
        {data.subtitle && (
          <span className="text-[10px] font-label text-muted-foreground/80 bg-background/80 border border-border px-2 py-0.5 rounded-md tracking-tight whitespace-nowrap">
            {data.subtitle}
          </span>
        )}

        {/* Auto-fit button */}
        <button
          onClick={handleAutoFit}
          title="Auto-fit to children"
          className="ml-1 p-1 bg-panel border border-border rounded hover:bg-surface hover:text-foreground text-muted-foreground transition-colors shadow-sm flex items-center justify-center"
        >
          <Maximize size={11} />
        </button>
      </div>

      {/* ── Decorative corner markers ── */}
      <div className={`absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 rounded-tl-md ${selected ? v.borderSelected : v.border} opacity-60`} />
      <div className={`absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 rounded-tr-md ${selected ? v.borderSelected : v.border} opacity-60`} />
      <div className={`absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 rounded-bl-md ${selected ? v.borderSelected : v.border} opacity-60`} />
      <div className={`absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 rounded-br-md ${selected ? v.borderSelected : v.border} opacity-60`} />

      {/* ── Watermark icon ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <Globe size={64} className="text-muted-foreground/10" strokeWidth={1} />
      </div>

      {/* ── Connection handles (invisible, functional) ── */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-1.5 !rounded-sm !bg-muted-foreground/50 !border-none !-top-1"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-1.5 !rounded-sm !bg-muted-foreground/50 !border-none !-bottom-1"
      />
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        className="!w-1.5 !h-3 !rounded-sm !bg-muted-foreground/50 !border-none !-left-1"
      />
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        className="!w-1.5 !h-3 !rounded-sm !bg-muted-foreground/50 !border-none !-right-1"
      />
    </div>
  );
};

export default memo(ZoneNode);
