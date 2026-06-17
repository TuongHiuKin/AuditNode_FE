import { useState, useEffect } from "react";
import { NavLink, Outlet, useOutletContext, useLocation } from "react-router";
import { Server, Grid, Download, ChevronDown, FileText, FileSpreadsheet, X, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useHeader } from "../hooks/useHeader";
import { BulkImportModal } from "../components/BulkImportModal";
import { exportToExcel, exportToCSV, ExportFormat } from "../../shared/utils/exportUtils";
import apiClient from "../../shared/api/client";
import { useWorkspaceStore } from "../hooks/useWorkspaceStore";

// Context type shared with child routes
type InventoryOutletContext = {
  onRefresh: () => void;
  selectedIds: string[];
  onSelectRow: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  isSelectionMode: boolean;
  selectedColumns: string[];
  toggleColumn: (key: string) => void;
};

export function useInventoryContext() {
  return useOutletContext<InventoryOutletContext>();
}

const inventoryTabs = [
  { name: "Servers", path: "/inventory/servers", icon: <Server size={16} />, type: "servers" as const },
  { name: "Applications", path: "/inventory/applications", icon: <Grid size={16} />, type: "applications" as const },
];

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

export function InventoryLayout() {
  const { setHeader } = useHeader();
  const { activeWorkspace } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("excel");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Row Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Determine current type based on path
  const currentTab = inventoryTabs.find(tab => location.pathname === tab.path) || inventoryTabs[0];
  const columns = currentTab.type === "servers" ? SERVER_COLUMNS : APP_COLUMNS;

  // Column Selection State
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns.map(c => c.key));

  useEffect(() => {
    setHeader(
      "Infrastructure Inventory",
      "Manage expected state of servers and registered applications.",
      <Server size={20} />
    );
  }, [setHeader]);

  // Sync columns when tab changes
  useEffect(() => {
    setSelectedColumns(columns.map(c => c.key));
  }, [currentTab.type]);

  // Clear selection when switching tabs or exiting selection mode
  useEffect(() => {
    setSelectedIds([]);
  }, [location.pathname, isSelectionMode]);

  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["servers"] });
    queryClient.invalidateQueries({ queryKey: ["applications"] });
  };

  const onSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const onSelectAll = (ids: string[]) => {
    setSelectedIds(prev => {
      const allSelected = ids.every(id => prev.includes(id));
      if (allSelected) {
        return prev.filter(id => !ids.includes(id));
      } else {
        const newSet = new Set([...prev, ...ids]);
        return Array.from(newSet);
      }
    });
  };

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const enableSelectionMode = (format: ExportFormat) => {
    setExportFormat(format);
    setIsSelectionMode(true);
    setIsExportOpen(false);
  };

  const disableSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds([]);
  };

  const handleExportNow = async () => {
    // Step 1: Validation
    if (selectedIds.length === 0) {
      toast.error("Please select at least one row to export.");
      return;
    }

    if (selectedColumns.length === 0) {
      toast.error("Please select at least one column to export.");
      return;
    }

    // Step 2: Loading State
    setIsExporting(true);
    try {
      // Step 3: API Fetch (Bulk fetch with specific IDs and /export endpoint)
      const baseEndpoint = currentTab.type === "servers" ? "/api/v1/servers" : "/api/v1/applications";
      const response = await apiClient.get(`${baseEndpoint}/export`, {
        params: { ids: selectedIds.join(',') }
      });
      
      let rawData = Array.isArray(response.data) ? response.data : (response.data as any)?.data || [];
      
      // Secondary filter in case the API doesn't support the param yet
      if (rawData.length > selectedIds.length) {
        rawData = rawData.filter((item: any) => selectedIds.includes(item.id));
      }

      // Step 4: Data Mapping (Create objects with ONLY selected columns)
      const exportData = rawData.map((item: any) => {
        const row: Record<string, any> = {};
        columns.forEach((col) => {
          if (selectedColumns.includes(col.key)) {
            // Use Label as Key for the exported file headers
            row[col.label] = item[col.key] ?? "N/A";
          }
        });
        return row;
      });

      // Step 5: File Generation
      const date = new Date().toISOString().split("T")[0];
      const workspaceName = activeWorkspace?.name?.replace(/\s+/g, "_") || "Global";
      const typeLabel = currentTab.type === "servers" ? "Servers" : "Applications";
      const baseFileName = `${workspaceName}_${typeLabel}_AuditExport_${date}`;
      
      if (exportFormat === "excel") {
        exportToExcel(exportData, baseFileName);
      } else {
        exportToCSV(exportData, baseFileName);
      }

      toast.success(`${exportFormat.toUpperCase()} export generated successfully!`);
      
      // Step 6: Cleanup
      disableSelectionMode();
    } catch (err: any) {
      console.error("[Export Error]", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to generate export file.";
      toast.error(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Tab bar + Action buttons */}
      <div className="px-8 pt-5 pb-0 shrink-0 bg-background/50 flex items-end justify-between">
        {/* Left: Servers / Applications tabs */}
        <div className="flex items-center gap-1 bg-surface p-1 rounded-xl w-max border border-border">
          {inventoryTabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? "bg-background text-primary shadow-sm border border-border"
                  : "text-secondary hover:text-primary hover:bg-background/50"}`
              }
            >
              {tab.icon}
              {tab.name}
            </NavLink>
          ))}
        </div>

        {/* Right: Actions or Selection Mode Bar */}
        <div className="flex items-center gap-3 pb-1">
          {isSelectionMode ? (
            <div className="flex items-center gap-4 bg-tertiary/5 border border-tertiary/20 px-4 py-1.5 rounded-xl animate-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col">
                <p className="text-[10px] text-tertiary font-bold uppercase tracking-widest leading-none mb-0.5">Export Selection Mode</p>
                <p className="text-sm font-semibold text-primary">
                  {selectedIds.length === 0 ? "Select rows to export..." : `${selectedIds.length} entities selected`}
                </p>
              </div>
              
              <div className="h-8 w-[1px] bg-tertiary/20 mx-1" />
              
              <div className="flex items-center gap-2">
                <button
                  onClick={disableSelectionMode}
                  className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportNow}
                  disabled={selectedIds.length === 0 || isExporting}
                  className="flex items-center gap-2 bg-tertiary hover:bg-tertiary/90 text-primary-foreground px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-[0_0_20px_rgba(255,77,126,0.2)] disabled:opacity-50 disabled:shadow-none min-w-[140px] justify-center"
                >
                  {isExporting ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  {isExporting ? "Exporting..." : "Export Now"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Standard Actions */}
              <button
                onClick={() => setIsBulkImportOpen(true)}
                className="flex items-center gap-2 bg-surface hover:bg-surface/80 border border-border px-4 py-2 rounded-lg text-sm font-medium text-primary transition-colors shadow-sm"
              >
                <FileSpreadsheet size={16} className="text-blue-500" />
                Bulk Import
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  className="flex items-center gap-2 bg-surface hover:bg-surface/80 border border-border px-4 py-2 rounded-lg text-sm font-medium text-primary transition-colors shadow-sm"
                >
                  <Download size={16} className="text-tertiary" />
                  Export View
                  <ChevronDown size={14} className="text-secondary" />
                </button>
                {isExportOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <button
                        onClick={() => enableSelectionMode("excel")}
                        className="flex items-center w-full text-left px-4 py-3 hover:bg-background text-sm text-primary transition-colors border-b border-border/50"
                      >
                        <FileSpreadsheet size={16} className="mr-3 text-green-500" />
                        Selective Excel Export (.xlsx)
                      </button>
                      <button
                        onClick={() => enableSelectionMode("csv")}
                        className="flex items-center w-full text-left px-4 py-3 hover:bg-background text-sm text-primary transition-colors"
                      >
                        <FileText size={16} className="mr-3 text-blue-500" />
                        Selective Raw Data (.csv)
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Child Content Area */}
      <div className="flex-1 overflow-y-auto relative bg-background">
        <Outlet context={{ 
          onRefresh, 
          selectedIds, 
          onSelectRow, 
          onSelectAll, 
          isSelectionMode,
          selectedColumns,
          toggleColumn
        }} />
      </div>

      {/* Modals */}
      {isBulkImportOpen && (
        <BulkImportModal
          onClose={() => setIsBulkImportOpen(false)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}
