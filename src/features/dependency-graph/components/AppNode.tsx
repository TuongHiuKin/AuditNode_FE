import { Handle, Position, NodeProps } from "@xyflow/react";
import { CreditCard, Shield, Database, Zap, Globe } from "lucide-react";
import { AppNode as AppNodeModel } from "../types";

const ICONS: Record<string, any> = { CreditCard, Shield, Database, Zap, Globe };

export function AppNode({ data, selected }: NodeProps<AppNodeModel>) {
  const Icon = ICONS[data.app.icon] || Globe;
  return (
    <div
      className={`group relative flex items-center gap-3 p-1.5 pr-4 rounded-none bg-surface transition-all duration-200 ease-in-out select-none border ${
        selected
          ? "border-primary shadow-[0_0_15px_oklch(0.62_0.22_25/0.15)]"
          : "border-border hover:border-border/80 hover:shadow-sm"
      }`}
      style={{ width: 240, height: 44 }}
    >
      {/* 4-Sided Multi-directional Handles (Reveal on Hover) */}
      {/* Top */}
      <Handle type="target" position={Position.Top} id="t-t" className="w-2.5 h-2.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-surface !-top-1.25" />
      <Handle type="source" position={Position.Top} id="t-s" className="w-2.5 h-2.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-surface !-top-1.25" />
      
      {/* Right */}
      <Handle type="target" position={Position.Right} id="r-t" className="w-2.5 h-2.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-surface !-right-1.25" />
      <Handle type="source" position={Position.Right} id="r-s" className="w-2.5 h-2.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-surface !-right-1.25" />
      
      {/* Bottom */}
      <Handle type="target" position={Position.Bottom} id="b-t" className="w-2.5 h-2.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-surface !-bottom-1.25" />
      <Handle type="source" position={Position.Bottom} id="b-s" className="w-2.5 h-2.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-surface !-bottom-1.25" />
      
      {/* Left */}
      <Handle type="target" position={Position.Left} id="l-t" className="w-2.5 h-2.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-surface !-left-1.25" />
      <Handle type="source" position={Position.Left} id="l-s" className="w-2.5 h-2.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-2 border-surface !-left-1.25" />

      <div
        className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${
          selected ? "bg-primary text-primary-foreground" : "bg-background/50 text-muted-foreground"
        }`}
      >
        <Icon size={14} />
      </div>
      <div className="h-4 w-px bg-border shrink-0" />
      <div className="flex flex-col shrink-0">
        <span className="text-[10px] font-label text-primary/90 font-bold tracking-tighter leading-none">{data.app.portNumber}</span>
        <span className="text-[8px] font-label text-muted-foreground/50 font-bold uppercase tracking-tight leading-none mt-0.5">{data.app.protocol}</span>
      </div>
      <div className="h-4 w-px bg-border shrink-0" />
      <span className="text-xs font-medium text-foreground/90 truncate flex-1 font-body">
        {data.app.appName}
      </span>
      {data.app.risk && (
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ml-1 ${
          data.app.risk === "Critical" || data.app.risk === "High" ? "bg-danger" :
          data.app.risk === "Medium" ? "bg-warning" : "bg-success"
        }`} title={`Risk: ${data.app.risk}`} />
      )}
    </div>
  );
}
