import React, { useState, useRef, useEffect } from "react";
import { Filter, Check, ChevronDown, Search } from "lucide-react";
import { LabelData } from "./LabelBadge";
import apiClient from "../../shared/api/client";

interface LabelFilterDropdownProps {
  selectedKeys: string[];
  onChange: (selectedKeys: string[]) => void;
}

export function LabelFilterDropdown({ selectedKeys, onChange }: LabelFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableLabels, setAvailableLabels] = useState<LabelData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchLabels() {
      try {
        const response = await apiClient.get("/api/v1/inventory/labels");
        setAvailableLabels(response.data || []);
      } catch (error) {
        console.error("Failed to fetch labels", error);
      }
    }
    fetchLabels();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleLabel = (value: string) => {
    if (selectedKeys.includes(value)) {
      onChange(selectedKeys.filter(v => v !== value));
    } else {
      onChange([...selectedKeys, value]);
    }
  };

  const selectedCount = selectedKeys.length;

  const filteredLabels = availableLabels.filter(l => 
    l.value.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="absolute top-full left-0 mt-2 w-64 bg-panel border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-2 border-b border-border bg-surface/50 flex items-center gap-2">
            <Search className="size-3.5 text-muted-foreground shrink-0" />
            <input 
              type="text" 
              placeholder="Search labels..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none border-none p-0"
              autoFocus
            />
          </div>
          <div className="max-h-[250px] overflow-y-auto p-1.5 flex flex-col gap-0.5">
            {filteredLabels.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground text-center italic">
                {searchTerm ? "No matches found" : "No labels found"}
              </p>
            ) : (
              filteredLabels.map((label) => {
                return (
                  <button
                    key={label.value}
                    onClick={() => toggleLabel(label.value)}
                    className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-left transition-colors hover:bg-surface-hover group"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="shrink-0 text-[9px] font-mono font-bold text-muted-foreground uppercase bg-surface border border-border rounded px-1 py-0.5 leading-none">
                        {label.key}
                      </span>
                      <span className="text-xs font-mono font-semibold text-foreground uppercase truncate">
                        {label.value}
                      </span>
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      selectedKeys.includes(label.value) ? "bg-primary border-primary" : "border-border group-hover:border-primary/40"
                    }`}>
                      {selectedKeys.includes(label.value) && <Check size={10} className="text-primary-foreground" />}
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
