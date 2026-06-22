import { useState, useEffect } from "react";
import { NavLink, Outlet, useOutletContext, useLocation } from "react-router";
import { Server, Grid, Download, ChevronDown, FileText, FileSpreadsheet, X, ArrowRight, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useHeader } from "../hooks/useHeader";
import { BulkImportModal } from "../components/BulkImportModal";
import { exportToExcel, exportToCSV, ExportFormat } from "../../shared/utils/exportUtils";
import apiClient from "../../shared/api/client";
import { useWorkspaceStore } from "../hooks/useWorkspaceStore";
import { RegisterModal } from "../components/RegisterModal";

// Context type shared with child routes
type InventoryOutletContext = {
  onRefresh: () => void;
  selectedIds: string[];
  onSelectRow: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  isSelectionMode: boolean;
  selectedColumns: string[];
  toggleColumn: (key: string) => void;
  toolbarEl: HTMLDivElement | null;
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
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("excel");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toolbarEl, setToolbarEl] = useState<HTMLDivElement | null>(null);
  
  // Row Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Determine current type based on path
  const currentTab = inventoryTabs.find(tab => location.pathname === tab.path) || inventoryTabs[0];
  const columns = currentTab.type === "servers" ? SERVER_COLUMNS : APP_COLUMNS;

  // Column Selection State
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns.map(c => c.key));

  useEffect(() => {
    setHeader(
      ["INVENTORY", currentTab.type === "servers" ? "SERVER INVENTORY" : "APPLICATION INVENTORY"],
      "Infrastructure Inventory",
      "Manage the expected state of servers and registered applications.",
      <Server size={20} />
    );
  }, [setHeader, currentTab.type]);

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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background font-body">
      {/* Tabs, Toolbar & Action Buttons Row */}
      <div className="px-8 pt-8 shrink-0 flex items-end justify-between border-b border-border">
        {/* Left: Servers / Applications tabs & Toolbar */}
        <div className="flex items-end gap-8">
          <div className="flex gap-6">
            {inventoryTabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  `-mb-px border-b-2 pb-3 flex items-center gap-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {tab.name}
              </NavLink>
            ))}
          </div>
          
          {/* Teleport target for Search/Filter */}
          <div ref={setToolbarEl} className="pb-2" />
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-3 pb-3">
          <div className="flex items-center gap-3">
            {isSelectionMode ? (
              <div className="flex items-center gap-4 bg-primary/5 border border-primary/20 px-4 py-1.5 rounded-xl animate-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col">
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest leading-none mb-0.5 font-label">Export Selection Mode</p>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedIds.length === 0 ? "Select rows to export..." : `${selectedIds.length} entities selected`}
                  </p>
                </div>
                
                <div className="h-8 w-[1px] bg-primary/20 mx-1" />
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={disableSelectionMode}
                    className="px-4 h-[34px] text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExportNow}
                    disabled={selectedIds.length === 0 || isExporting}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-[0_0_20px_oklch(0.62_0.22_25/0.2)] disabled:opacity-50 disabled:shadow-none min-w-[140px] justify-center"
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
                <button
                  onClick={() => setIsBulkImportOpen(true)}
                  className="bg-surface hover:bg-surface/80 border border-border px-4 h-[34px] rounded-lg text-sm font-bold flex items-center gap-2 text-foreground transition-colors shadow-sm"
                >
                  <FileSpreadsheet size={16} className="text-muted-foreground" />
                  Bulk Import
                </button>

                <div className="relative">
                  <button
                    onClick={() => setIsExportOpen(!isExportOpen)}
                    className="bg-surface hover:bg-surface/80 border border-border px-4 h-[34px] rounded-lg text-sm font-bold flex items-center gap-2 text-foreground transition-colors shadow-sm"
                  >
                    <Download size={16} className="text-muted-foreground" />
                    Export
                    <ChevronDown size={14} className="text-muted-foreground ml-1" />
                  </button>
                  {isExportOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <button
                          onClick={() => enableSelectionMode("excel")}
                          className="flex items-center w-full text-left px-4 py-3 hover:bg-background text-sm text-foreground transition-colors border-b border-border/50"
                        >
                          <FileSpreadsheet size={16} className="mr-3 text-success" />
                          Selective Excel Export (.xlsx)
                        </button>
                        <button
                          onClick={() => enableSelectionMode("csv")}
                          className="flex items-center w-full text-left px-4 py-3 hover:bg-background text-sm text-foreground transition-colors"
                        >
                          <FileText size={16} className="mr-3 text-primary" />
                          Selective Raw Data (.csv)
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 h-[34px] rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(229,67,95,0.2)]"
                >
                  <Plus size={16} /> Register Entity
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Child Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col relative bg-background min-h-0">
        <Outlet context={{ 
          onRefresh, 
          selectedIds, 
          onSelectRow, 
          onSelectAll, 
          isSelectionMode,
          selectedColumns,
          toggleColumn,
          toolbarEl
        }} />
      </div>

      {/* Modals */}
      {isBulkImportOpen && (
        <BulkImportModal
          onClose={() => setIsBulkImportOpen(false)}
          onSuccess={onRefresh}
        />
      )}
      {isRegisterModalOpen && (
        <RegisterModal
          onClose={() => setIsRegisterModalOpen(false)}
          onSuccess={onRefresh}
          defaultMode={currentTab.type === "servers" ? "infra" : "app"}
        />
      )}
    </div>
  );
}
