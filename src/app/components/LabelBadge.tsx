import React from "react";

export interface LabelData {
  key: string;
  value: string;
  colorHex?: string;
}

interface LabelBadgeProps {
  label: LabelData;
  className?: string;
}

export function LabelBadge({ label, className = "" }: LabelBadgeProps) {
  // Use colorHex to create a translucent background (like hex + opacity), or fallback
  const customStyle: React.CSSProperties = label.colorHex
    ? {
        backgroundColor: `${label.colorHex}20`, // 20% opacity approx for hex
        borderColor: `${label.colorHex}40`,
        color: label.colorHex,
      }
    : {};

  const fallbackClass = !label.colorHex ? "bg-surface border-border text-foreground" : "border-solid";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase border tracking-widest ${fallbackClass} ${className}`}
      style={customStyle}
    >
      <span className="opacity-70 mr-1">{label.key}:</span>
      <span>{label.value}</span>
    </span>
  );
}
