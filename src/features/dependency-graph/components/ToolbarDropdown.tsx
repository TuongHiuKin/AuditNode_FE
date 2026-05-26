import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface DropdownOption {
  value: string;
  label: string;
}

interface ToolbarDropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
}

export function ToolbarDropdown({ label, value, options, onChange }: ToolbarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Display text: show label when "All", otherwise show selected option label
  const selectedOption = options.find((o) => o.value === value);
  const displayText = value === "All" ? label : selectedOption?.label ?? label;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-body
          transition-all duration-200 cursor-pointer select-none
          max-w-[160px] min-w-[120px]
          ${isOpen
            ? "bg-background border-tertiary/60 text-primary shadow-[0_0_8px_rgba(255,77,126,0.15)]"
            : "bg-background border-border text-primary hover:border-tertiary/40"
          }
        `}
      >
        <span className="truncate flex-1 text-left">{displayText}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-secondary transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 min-w-full w-max bg-surface border border-border rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`
                w-full text-left px-3 py-2 text-sm font-body transition-colors
                ${value === option.value
                  ? "bg-tertiary/10 text-tertiary font-medium"
                  : "text-primary hover:bg-background"
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
