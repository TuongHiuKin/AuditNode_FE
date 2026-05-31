import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, minWidth: 0 });

  // Calculate menu position when opening
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      minWidth: rect.width,
    });
  }, []);

  // Recalculate on open and on scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  // Display text: show label when "All", otherwise show selected option label
  const selectedOption = options.find((o) => o.value === value);
  const displayText = value === "All" ? label : selectedOption?.label ?? label;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
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

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-surface border border-border rounded-lg shadow-2xl overflow-hidden"
          style={{
            top: menuPos.top,
            left: menuPos.left,
            minWidth: menuPos.minWidth,
            zIndex: 9999,
            animation: "fadeSlideIn 150ms ease-out",
          }}
        >
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
        </div>,
        document.body
      )}
    </div>
  );
}
