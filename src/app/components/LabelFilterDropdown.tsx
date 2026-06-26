import React, { useState, useRef, useEffect } from "react";
import { Filter, Check, ChevronDown } from "lucide-react";
import { LabelData } from "./LabelBadge";

interface LabelFilterDropdownProps {
  availableLabels: LabelData[];
  selectedKeys: string[];
  onChange: (selectedKeys: string[]) => void;
}

export function LabelFilterDropdown({ availableLabels, selectedKeys, onChange }: LabelFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleLabel = (key: string) => {
    if (selectedKeys.includes(key)) {
      onChange(selectedKeys.filter(k => k !== key));
    } else {
      onChange([...selectedKeys, key]);
    }
  };

  const selectedCount = selectedKeys.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-body
          transition-all duration-200 cursor-pointer select-none
          h-[34px]
          ${isOpen
            ? "bg-background border-primary/60 text-foreground shadow-[0_0_8px_oklch(0.62_0.22_25/0.15)]"
            : "bg-background border-border text-foreground hover:border-primary/40"
          }
        `}
      >
        <Filter className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate flex-1 text-left">Labels</span>
        {selectedCount > 0 && (
          <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
            {selectedCount}
          </span>
        )}
        <ChevronDown className={`size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-panel border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 border-b border-border bg-surface/50">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Filter by Labels</p>
          </div>
          <div className="max-h-[250px] overflow-y-auto p-1.5 flex flex-col gap-0.5">
            {availableLabels.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground text-center italic">No labels found</p>
            ) : (
              availableLabels.map((label) => {
                const isSelected = selectedKeys.includes(label.key);
                return (
                  <button
                    key={label.key}
                    onClick={() => toggleLabel(label.key)}
                    className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-surface-hover group"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-mono font-bold text-foreground uppercase truncate">{label.key}</span>
                      <span className="text-[10px] text-muted-foreground font-mono uppercase truncate">{label.value}</span>
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      isSelected ? "bg-primary border-primary" : "border-border"
                    }`}>
                      {isSelected && <Check size={10} className="text-primary-foreground" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
