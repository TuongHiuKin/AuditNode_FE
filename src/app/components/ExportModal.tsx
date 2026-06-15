import { X, FileSpreadsheet, Download, Check } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { useWorkspaceStore } from "../hooks/useWorkspaceStore";
import apiClient from "../../shared/api/client";

export interface ExportModalProps {
  onClose: () => void;
  type: "servers" | "applications";
  selectedIds: string[];
}

interface ColumnOption {
  key: string;
  label: string;
}

const SERVER_COLUMNS: ColumnOption[] = [
  { key: "ipAddress", label: "IP Address" },
  { key: "hostname", label: "Hostname" },
  { key: "osType", label: "OS Type" },
  { key: "environment", label: "Environment" },
  { key: "status", label: "Status" },
  { key: "datacenterName", label: "Datacenter" },
];

const APP_COLUMNS: ColumnOption[] = [
  { key: "appCode", label: "App Code" },
  { key: "appName", label: "Application Name" },
  { key: "ownerTeam", label: "Owner Team" },
  { key: "risk", label: "Risk Level" },
  { key: "portNumber", label: "Port" },
  { key: "protocol", label: "Protocol" },
  { key: "techStack", label: "Tech Stack" },
];

export function ExportModal({ onClose, type, selectedIds }: ExportModalProps) {
  const { activeWorkspace } = useWorkspaceStore();
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    (type === "servers" ? SERVER_COLUMNS : APP_COLUMNS).map((c) => c.key)
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const columns = type === "servers" ? SERVER_COLUMNS : APP_COLUMNS;

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast.error("Please select at least one column to export.");
      return;
    }

    setIsGenerating(true);
    try {
      // 1. Fetch full data for selected IDs
      // Note: Backend endpoint might need to support filtering by IDs
      // For now, we'll fetch based on the type. If selectedIds is provided, we filter client-side 
      // or assume a specialized export endpoint exists as per specs.
      const endpoint = type === "servers" ? "/api/Servers" : "/api/Applications";
      const response = await apiClient.get(endpoint);
      
      let rawData = Array.isArray(response.data) ? response.data : (response.data as any)?.data || [];
      
      // Filter by selected IDs if any
      if (selectedIds.length > 0) {
        rawData = rawData.filter((item: any) => selectedIds.includes(item.id));
      }

      // 2. Map data to selected columns with readable headers
      const exportData = rawData.map((item: any) => {
        const row: Record<string, any> = {};
        columns.forEach((col) => {
          if (selectedColumns.includes(col.key)) {
            row[col.label] = item[col.key] ?? "N/A";
          }
        });
        return row;
      });

      // 3. Generate XLSX
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Audit Export");

      // 4. Trigger Download
      const date = new Date().toISOString().split("T")[0];
      const workspaceName = activeWorkspace?.name?.replace(/\s+/g, "_") || "Global";
      const fileName = `${workspaceName}_${type === "servers" ? "Servers" : "Applications"}_AuditExport_${date}.xlsx`;
      
      XLSX.writeFile(wb, fileName);
      toast.success("Export generated successfully!");
      onClose();
    } catch (err: any) {
      console.error("Export failed", err);
      toast.error("Failed to generate export file.");
    } finally {
      setIsGenerating(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-[60] p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20 text-green-500">
              <FileSpreadsheet size={18} />
            </div>
            <h3 className="text-lg font-bold text-white">Export Options</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Rows selected:</span>
            <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {selectedIds.length > 0 ? selectedIds.length : "Current View (All)"}
            </span>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Include Columns</label>
            <div className="grid grid-cols-1 gap-2 bg-slate-900/40 p-3 rounded-xl border border-slate-800/50">
              {columns.map((col) => (
                <div 
                  key={col.key} 
                  className="flex items-center justify-between group cursor-pointer"
                  onClick={() => toggleColumn(col.key)}
                >
                  <span className={`text-sm transition-colors ${selectedColumns.includes(col.key) ? "text-primary" : "text-slate-500"}`}>
                    {col.label}
                  </span>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                    selectedColumns.includes(col.key) 
                      ? "bg-tertiary border-tertiary" 
                      : "border-slate-700 group-hover:border-slate-500"
                  }`}>
                    {selectedColumns.includes(col.key) && <Check size={12} className="text-white" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isGenerating}
            className="bg-green-600 hover:bg-green-700 gap-2 shadow-lg shadow-green-900/20"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Confirm Export
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
