import { Handle, Position } from "@xyflow/react";
import { CreditCard, Shield, Database, Zap, Globe } from "lucide-react";

const ICONS: Record<string, any> = { CreditCard, Shield, Database, Zap, Globe };

export function AppNode({ data, selected }: any) {
  const Icon = ICONS[data.app.icon] || Globe;
  return (
    <div
      className={`flex items-center gap-3 p-1.5 pr-4 rounded-xl bg-[#0f172a] transition-all select-none shadow-md border-2 ${
        selected
          ? "border-tertiary shadow-[0_0_15px_rgba(255,77,126,0.2)]"
          : "border-[#1e293b] hover:border-secondary"
      }`}
      style={{ width: 240, height: 44 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "#FF4D7E", border: "none", width: 8, height: 8, left: -4 }}
      />
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
          selected ? "bg-tertiary text-primary-foreground" : "bg-background text-secondary"
        }`}
      >
        <Icon size={16} />
      </div>
      <div className="h-4 w-px bg-border shrink-0" />
      <span className="text-xs font-mono text-tertiary shrink-0">{data.app.portNumber}</span>
      <div className="h-4 w-px bg-border shrink-0" />
      <span className="text-sm font-medium text-primary truncate flex-1 font-body">
        {data.app.appName}
      </span>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "#FF4D7E", border: "none", width: 8, height: 8, right: -4 }}
      />
    </div>
  );
}
