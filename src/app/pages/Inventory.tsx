import { useState } from "react";
import { Server, Grid } from "lucide-react";
import { ServerTable } from "../components/ServerTable";
import { AppTable } from "../components/AppTable";

export function Inventory() {
  const [activeTab, setActiveTab] = useState<"servers" | "applications">("servers");

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 relative h-full flex flex-col bg-background font-body">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2 font-display">
            <Server className="text-secondary" />
            Infrastructure Inventory
          </h2>
          <p className="text-secondary mt-1 text-sm">Manage expected state of servers and registered applications.</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-surface p-1 rounded-xl w-max border border-border shrink-0">
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

      {/* Conditional Table */}
      {activeTab === "servers" ? <ServerTable /> : <AppTable />}
    </div>
  );
}
