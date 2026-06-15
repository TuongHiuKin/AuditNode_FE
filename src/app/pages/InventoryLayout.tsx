import { useState, useEffect } from "react";
import { NavLink, Outlet, useOutletContext, useLocation } from "react-router";
import { Server, Grid, Download, ChevronDown, Image as ImageIcon, FileText, FileSpreadsheet, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useHeader } from "../hooks/useHeader";
import { BulkImportModal } from "../components/BulkImportModal";
import { ExportModal } from "../components/ExportModal";

// Context type shared with child routes
type InventoryOutletContext = {
  onRefresh: () => void;
  selectedIds: string[];
  onSelectRow: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
};

export function useInventoryContext() {
  return useOutletContext<InventoryOutletContext>();
}

const inventoryTabs = [
  { name: "Servers", path: "/inventory/servers", icon: <Server size={16} />, type: "servers" as const },
  { name: "Applications", path: "/inventory/applications", icon: <Grid size={16} />, type: "applications" as const },
];

export function InventoryLayout() {
  const { setHeader } = useHeader();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  // Row Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Determine current type based on path
  const currentTab = inventoryTabs.find(tab => location.pathname === tab.path) || inventoryTabs[0];

  useEffect(() => {
    setHeader(
      "Infrastructure Inventory",
      "Manage expected state of servers and registered applications.",
      <Server size={20} />
    );
  }, [setHeader]);

  // Clear selection when switching tabs
  useEffect(() => {
    setSelectedIds([]);
  }, [location.pathname]);

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
      // If all provided ids are already in prev, deselect them all
      const allSelected = ids.every(id => prev.includes(id));
      if (allSelected) {
        return prev.filter(id => !ids.includes(id));
      } else {
        // Otherwise, ensure all are included
        const newSet = new Set([...prev, ...ids]);
        return Array.from(newSet);
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Tab bar + Action buttons — same row, no divider between them */}
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

        {/* Right: Bulk Import + Export View */}
        <div className="flex items-center gap-3 pb-1">
          {/* Selected Count Indicator */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-tertiary/10 border border-tertiary/20 rounded-lg text-xs font-bold text-tertiary animate-in fade-in slide-in-from-right-2">
              <span>{selectedIds.length} SELECTED</span>
              <button onClick={() => setSelectedIds([])} className="hover:text-primary">
                <X size={12} />
              </button>
            </div>
          )}

          {/* Bulk Import */}
          <button
            onClick={() => setIsBulkImportOpen(true)}
            className="flex items-center gap-2 bg-surface hover:bg-surface/80 border border-border px-4 py-2 rounded-lg text-sm font-medium text-primary transition-colors shadow-sm"
          >
            <FileSpreadsheet size={16} className="text-blue-500" />
            Bulk Import
          </button>

          {/* Export View Dropdown */}
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
                <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => { setIsExportOpen(false); setIsExportModalOpen(true); }}
                    className="flex items-center w-full text-left px-4 py-3 hover:bg-background text-sm text-primary transition-colors border-b border-border/50"
                  >
                    <FileSpreadsheet size={16} className="mr-3 text-green-500" />
                    Selective Excel Export
                  </button>
                  <button
                    onClick={() => setIsExportOpen(false)}
                    className="flex items-center w-full text-left px-4 py-3 hover:bg-background text-sm text-primary transition-colors border-b border-border/50"
                  >
                    <ImageIcon size={16} className="mr-3 text-tertiary" />
                    Export as PNG Image
                  </button>
                  <button
                    onClick={() => setIsExportOpen(false)}
                    className="flex items-center w-full text-left px-4 py-3 hover:bg-background text-sm text-primary transition-colors border-b border-border/50"
                  >
                    <ImageIcon size={16} className="mr-3 text-tertiary" />
                    Export as JPEG
                  </button>
                  <button
                    onClick={() => setIsExportOpen(false)}
                    className="flex items-center w-full text-left px-4 py-3 hover:bg-background text-sm text-primary transition-colors"
                  >
                    <FileText size={16} className="mr-3 text-tertiary" />
                    Export Raw Data (.csv)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Child Content Area */}
      <div className="flex-1 overflow-y-auto relative bg-background">
        <Outlet context={{ onRefresh, selectedIds, onSelectRow, onSelectAll }} />
      </div>

      {/* Modals */}
      {isBulkImportOpen && (
        <BulkImportModal
          onClose={() => setIsBulkImportOpen(false)}
          onSuccess={onRefresh}
        />
      )}

      {isExportModalOpen && (
        <ExportModal
          onClose={() => setIsExportModalOpen(false)}
          type={currentTab.type}
          selectedIds={selectedIds}
        />
      )}
    </div>
  );
}
