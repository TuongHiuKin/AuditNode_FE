import { Globe, Wifi, Database, Zap, Shield, CreditCard } from "lucide-react";

const PROTOCOL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  HTTP:  { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  HTTPS: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  gRPC:  { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/30"  },
  TCP:   { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/30"   },
  UDP:   { bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/30"     },
  AMQP:  { bg: "bg-rose-500/10",    text: "text-rose-400",    border: "border-rose-500/30"    },
};

const RISK_STYLES: Record<string, { glow: string; dot: string }> = {
  Critical: { glow: "shadow-[0_0_12px_rgba(244,63,94,0.25)]", dot: "bg-rose-500" },
  High:     { glow: "shadow-[0_0_12px_rgba(244,63,94,0.2)]",  dot: "bg-rose-500" },
  Medium:   { glow: "shadow-[0_0_10px_rgba(245,158,11,0.2)]", dot: "bg-amber-500" },
  Low:      { glow: "",                                         dot: "bg-emerald-500" },
};

const ICONS: Record<string, any> = { CreditCard, Shield, Database, Zap, Globe, Wifi };

interface TopologyAppCardProps {
  app: {
    id: string;
    appName: string;
    portNumber: number;
    protocol: string;
    risk?: string;
    icon?: string;
  };
  onDoubleClick?: (app: any) => void;
}

export function TopologyAppCard({ app, onDoubleClick }: TopologyAppCardProps) {
  const protocol = app.protocol?.toUpperCase() || "TCP";
  const protocolStyle = PROTOCOL_COLORS[protocol] || PROTOCOL_COLORS.TCP;
  const risk = app.risk || "Low";
  const riskStyle = RISK_STYLES[risk] || RISK_STYLES.Low;
  const Icon = ICONS[app.icon || ""] || Globe;

  return (
    <div
      className={`
        group relative bg-surface/80 border border-border/50 rounded-lg p-2.5
        cursor-pointer transition-all duration-200 ease-out
        hover:border-border hover:bg-surface-hover/90 hover:scale-[1.03]
        active:scale-[0.98]
        ${riskStyle.glow}
      `}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.(app);
      }}
      title={`${app.appName} — Port ${app.portNumber} (${protocol})`}
    >
      {/* Top Row: Icon + Port + Protocol Badge */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-panel border border-border/50 shrink-0 group-hover:border-border transition-colors">
          <Icon size={12} className="text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>

        <span className="text-[11px] font-label font-bold text-primary leading-none">
          :{app.portNumber}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Protocol Badge */}
          <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-sm border ${protocolStyle.bg} ${protocolStyle.text} ${protocolStyle.border} leading-none tracking-wider`}>
            {protocol}
          </span>

          {/* Risk Dot */}
          {app.risk && (
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${riskStyle.dot} ring-2 ring-black/30`}
              title={`Risk: ${risk}`}
            />
          )}
        </div>
      </div>

      {/* App Name */}
      <p className="text-[11px] font-medium text-foreground truncate leading-tight group-hover:text-primary transition-colors pl-0.5">
        {app.appName}
      </p>

      {/* Subtle bottom accent line */}
      <div className={`absolute bottom-0 left-2 right-2 h-px ${protocolStyle.bg} opacity-0 group-hover:opacity-100 transition-opacity`} />
    </div>
  );
}
