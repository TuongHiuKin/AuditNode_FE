import { useState, useEffect } from "react";
import { Server, Grid, Download, ChevronDown, Image as ImageIcon, FileText, Search, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ServerTable } from "../components/ServerTable";
import { AppTable } from "../components/AppTable";
import { RegisterModal } from "../components/RegisterModal";
import { useHeader } from "../hooks/useHeader";

export function Inventory() {
  const [activeTab, setActiveTab] = useState<"servers" | "applications">("servers");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const { setHeader } = useHeader();
  const queryClient = useQueryClient();

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["servers"] });
    queryClient.invalidateQueries({ queryKey: ["applications"] });
  };

  useEffect(() => {
    setHeader(
      "Infrastructure Inventory",
      "Manage expected state of servers and registered applications.",
      <Server size={20} />
    );
  }, [setHeader]);

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 relative min-h-full flex flex-col bg-background font-body">
      {/* Tabs & Export Row */}
      <div className="flex justify-between items-center w-full shrink-0">
        <div className="flex items-center gap-1 bg-surface p-1 rounded-xl w-max border border-border">
          <button
            onClick={() => setActiveTab("servers")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "servers"
                ? "bg-background text-primary shadow-sm border border-border"
                : "text-secondary hover:text-primary hover:bg-background/50"
            }`}
          >
            <Server size={16} /> Servers
          </button>
          <button
            onClick={() => setActiveTab("applications")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "applications"
                ? "bg-background text-primary shadow-sm border border-border"
                : "text-secondary hover:text-primary hover:bg-background/50"
            }`}
          >
            <Grid size={16} /> Applications
          </button>
        </div>

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

      {/* Conditional Table */}
      <div className="flex-1">
        {activeTab === "servers" 
          ? <ServerTable onRegister={() => setIsRegisterModalOpen(true)} /> 
          : <AppTable onRegister={() => setIsRegisterModalOpen(true)} />}
      </div>

      {isRegisterModalOpen && (
        <RegisterModal 
          onClose={() => setIsRegisterModalOpen(false)} 
          onSuccess={refreshData}
          defaultMode={activeTab === "servers" ? "infra" : "app"}
        />
      )}
    </div>
  );
}
