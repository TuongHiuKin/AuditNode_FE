import { Handle, Position, NodeProps } from "@xyflow/react";
import { CreditCard, Shield, Database, Zap, Globe } from "lucide-react";
import { AppNode as AppNodeModel } from "../types";

const ICONS: Record<string, any> = { CreditCard, Shield, Database, Zap, Globe };

export function AppNode({ data, selected }: NodeProps<AppNodeModel>) {
  const Icon = ICONS[data.app.icon] || Globe;
  return (
    <div
      className={`flex items-center gap-3 p-1.5 pr-4 rounded-none bg-[#0c1322] transition-all duration-200 ease-in-out select-none border ${
        selected
          ? "border-tertiary shadow-[0_0_15px_rgba(255,77,126,0.15)]"
          : "border-slate-800 hover:border-slate-700 hover:shadow-[0_0_10px_rgba(122,134,153,0.1)]"
      }`}
      style={{ width: 240, height: 44 }}
    >
      {/* Invisible Hitboxes - 4 sides, both Source and Target for full connectivity */}
      {/* Top side */}
      <Handle type="target" position={Position.Top} className="opacity-0 !w-full !h-3 !-top-1.5 !rounded-none !border-none !bg-transparent z-10" id="t-t" />
      <Handle type="source" position={Position.Top} className="opacity-0 !w-full !h-3 !-top-1.5 !rounded-none !border-none !bg-transparent z-10" id="t-s" />
      
      {/* Bottom side */}
      <Handle type="target" position={Position.Bottom} className="opacity-0 !w-full !h-3 !-bottom-1.5 !rounded-none !border-none !bg-transparent z-10" id="b-t" />
      <Handle type="source" position={Position.Bottom} className="opacity-0 !w-full !h-3 !-bottom-1.5 !rounded-none !border-none !bg-transparent z-10" id="b-s" />
      
      {/* Left side */}
      <Handle type="target" position={Position.Left} className="opacity-0 !h-full !w-3 !-left-1.5 !rounded-none !border-none !bg-transparent z-10" id="l-t" />
      <Handle type="source" position={Position.Left} className="opacity-0 !h-full !w-3 !-left-1.5 !rounded-none !border-none !bg-transparent z-10" id="l-s" />
      
      {/* Right side */}
      <Handle type="target" position={Position.Right} className="opacity-0 !h-full !w-3 !-right-1.5 !rounded-none !border-none !bg-transparent z-10" id="r-t" />
      <Handle type="source" position={Position.Right} className="opacity-0 !h-full !w-3 !-right-1.5 !rounded-none !border-none !bg-transparent z-10" id="r-s" />

      <div
        className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${
          selected ? "bg-tertiary text-primary-foreground" : "bg-slate-900/50 text-secondary"
        }`}
      >
        <Icon size={14} />
      </div>
      <div className="h-4 w-px bg-slate-800 shrink-0" />
      <div className="flex flex-col shrink-0">
        <span className="text-[10px] font-mono text-tertiary/90 font-bold tracking-tighter leading-none">{data.app.portNumber}</span>
        <span className="text-[8px] font-mono text-secondary/50 font-bold uppercase tracking-tight leading-none mt-0.5">{data.app.protocol}</span>
      </div>
      <div className="h-4 w-px bg-slate-800 shrink-0" />
      <span className="text-xs font-medium text-primary/90 truncate flex-1 font-body">
        {data.app.appName}
      </span>
      {data.app.risk && (
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ml-1 ${
          data.app.risk === "Critical" || data.app.risk === "High" ? "bg-rose-500" :
          data.app.risk === "Medium" ? "bg-amber-500" : "bg-emerald-500"
        }`} title={`Risk: ${data.app.risk}`} />
      )}
    </div>
  );
}
