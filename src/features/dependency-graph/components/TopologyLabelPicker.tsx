import { useMemo, useState } from "react";
import { Check, ChevronDown, Tags } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../shared/api/client";
import type { TopologyLabelData } from "../topology-types";
import type { GraphTopologyLabelDto } from "../types";
import { normalizeTopologyLabel } from "../utils/topologyGrouping";

interface TopologyLabelPickerProps {
  selectedLabels: TopologyLabelData[];
  onChange: (labels: TopologyLabelData[]) => void;
}

export function TopologyLabelPicker({
  selectedLabels,
  onChange,
}: TopologyLabelPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: availableLabels = [], isLoading } = useQuery({
    queryKey: ["topology-label-options"],
    queryFn: async () => {
      const response = await apiClient.get<GraphTopologyLabelDto[]>(
        "/api/v1/inventory/labels",
      );

      return response.data
        .map(normalizeTopologyLabel)
        .filter((label): label is TopologyLabelData => label !== null);
    },
  });

  const selectedIds = useMemo(
    () => new Set(selectedLabels.map((label) => label.id)),
    [selectedLabels],
  );

  const toggleLabel = (label: TopologyLabelData) => {
    if (selectedIds.has(label.id)) {
      onChange(selectedLabels.filter((selected) => selected.id !== label.id));
      return;
    }

    onChange([...selectedLabels, label]);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-[34px] min-w-40 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs text-foreground transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
      >
        <Tags size={14} className="text-muted-foreground" />
        <span className="flex-1 text-left font-label uppercase tracking-wide">
          Labels
        </span>
        {selectedLabels.length > 0 && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-label text-[10px] font-bold text-primary">
            {selectedLabels.length}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 top-full z-50 mt-2 max-h-72 w-72 overflow-y-auto rounded-lg border border-border bg-panel p-1.5 shadow-2xl"
        >
          {isLoading && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Loading labels...</p>
          )}

          {!isLoading && availableLabels.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No labels available</p>
          )}

          {availableLabels.map((label) => {
            const isSelected = selectedIds.has(label.id);

            return (
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                key={label.id}
                onClick={() => toggleLabel(label)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <span
                  className="size-2 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: label.colorHex || "var(--color-secondary)" }}
                />
                <span className="min-w-0 flex-1 truncate font-label text-[10px] uppercase tracking-wide text-foreground">
                  <span className="text-muted-foreground">{label.key}:</span>{" "}
                  {label.value}
                </span>
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  }`}
                >
                  {isSelected && <Check size={11} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
