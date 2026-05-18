import { Server as ServerIcon } from "lucide-react";

export function ServerNode({ data, selected }: any) {
  return (
    <div
      className={`border-2 border-dashed rounded-xl transition-all relative ${
        selected ? "border-tertiary/50 bg-tertiary/5" : "border-[#1e293b]/50 bg-[#0f172a]/10"
      }`}
      style={{ width: data.width, height: data.height }}
    >
      <div className="absolute -top-7 left-2 flex items-center gap-2">
        <ServerIcon size={14} className="text-secondary" />
        <span className="text-sm font-bold text-primary font-display">{data.server.hostname}</span>
        <span className="text-[10px] font-mono text-secondary bg-background px-1.5 py-0.5 rounded border border-[#1e293b] uppercase">
          {data.server.ipAddress}
        </span>
      </div>
    </div>
  );
}
