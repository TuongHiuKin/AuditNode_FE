import { Handle, Position } from "@xyflow/react";
import { CreditCard, Shield, Database, Zap, Globe } from "lucide-react";

const ICONS: Record<string, any> = { CreditCard, Shield, Database, Zap, Globe };

export function AppNode({ data, selected }: any) {
  const Icon = ICONS[data.app.icon] || Globe;
  return (
    <div
      className={`flex items-center gap-3 p-1.5 pr-4 rounded-lg bg-[#0c1322] transition-all duration-200 ease-in-out select-none border ${
        selected
          ? "border-tertiary shadow-[0_0_15px_rgba(255,77,126,0.15)]"
          : "border-slate-800 hover:border-slate-700 hover:shadow-[0_0_10px_rgba(122,134,153,0.1)]"
      }`}
      style={{ width: 240, height: 44 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "#FF4D7E", border: "none", width: 6, height: 6, left: -3 }}
      />
      <div
        className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${
          selected ? "bg-tertiary text-primary-foreground" : "bg-slate-900/50 text-secondary"
        }`}
      >
        <Icon size={14} />
      </div>
      <div className="h-4 w-px bg-slate-800 shrink-0" />
      <span className="text-[11px] font-mono text-tertiary/90 shrink-0 font-bold tracking-tighter">{data.app.portNumber}</span>
      <div className="h-4 w-px bg-slate-800 shrink-0" />
      <span className="text-xs font-medium text-primary/90 truncate flex-1 font-body">
        {data.app.appName}
      </span>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "#FF4D7E", border: "none", width: 6, height: 6, right: -3 }}
      />
    </div>
  );
}
