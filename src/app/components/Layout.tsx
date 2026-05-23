import { useState } from "react";
import { Outlet } from "react-router";
import { X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function Layout() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registerMode, setRegisterMode] = useState<"server" | "app">("server");

  return (
    <div className="flex h-screen bg-background text-primary overflow-hidden font-body selection:bg-tertiary/30">
      <Sidebar />

      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <Topbar onOpenModal={() => setIsModalOpen(true)} />
        <div className="flex-1 overflow-hidden relative flex flex-col bg-background">
          <Outlet />
        </div>
      </main>

      {/* Global Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-surface rounded-t-2xl">
              <h3 className="text-lg font-bold text-primary font-display">Register New Entity</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-secondary hover:text-primary transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 pt-5 pb-2">
              <div className="flex p-1 bg-background rounded-lg border border-border">
                <button
                  onClick={() => setRegisterMode("server")}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${registerMode === "server" ? "bg-surface text-primary shadow-sm border border-border" : "text-secondary hover:text-primary"}`}
                >
                  New Server
                </button>
                <button
                  onClick={() => setRegisterMode("app")}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${registerMode === "app" ? "bg-surface text-primary shadow-sm border border-border" : "text-secondary hover:text-primary"}`}
                >
                  New Application
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 pt-4">
              {registerMode === "server" ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-secondary font-label">Zone / Datacenter</label>
                    <select className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-tertiary transition-colors">
                      <option>Corporate Datacenter</option>
                      <option>DMZ (Public Facing)</option>
                      <option>AWS us-east-1</option>
                      <option>Azure Edge</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-secondary font-label">Server IP</label>
                      <input type="text" placeholder="10.0.x.x" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-tertiary font-label transition-colors" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-secondary font-label">Hostname</label>
                      <input type="text" placeholder="web-node-01" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-tertiary transition-colors" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-secondary font-label">OS Type</label>
                      <select className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-tertiary transition-colors">
                        <option>Ubuntu 22.04</option><option>RHEL 8</option><option>CentOS 7</option><option>Windows Server 2022</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-secondary font-label">Environment</label>
                      <select className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-tertiary transition-colors">
                        <option>Production</option><option>Staging</option><option>Development</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-secondary font-label">Initial Status</label>
                    <select className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-tertiary transition-colors">
                      <option>Active</option><option>Provisioning</option><option>Maintenance</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-secondary font-label">Target Server</label>
                    <select className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-tertiary transition-colors">
                      <option>Select Server...</option>
                      <option>prod-web-01 (10.0.4.15)</option>
                      <option>legacy-auth-db (10.0.4.18)</option>
                      <option>prod-db-master (10.0.4.22)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5 col-span-1">
                      <label className="text-sm font-medium text-secondary font-label">App Code</label>
                      <input type="text" placeholder="PAY-01" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-tertiary transition-colors uppercase font-label" />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-sm font-medium text-secondary font-label">Application Name</label>
                      <input type="text" placeholder="Payment Gateway" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-tertiary transition-colors" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-secondary font-label">Port</label>
                      <input type="number" placeholder="443" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-tertiary font-label transition-colors" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-secondary font-label">Protocol</label>
                      <select className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-tertiary transition-colors">
                        <option>TCP</option><option>UDP</option><option>HTTPS</option><option>HTTP</option><option>gRPC</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-secondary font-label">Owner Team</label>
                      <input type="text" placeholder="e.g. SecOps" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-tertiary transition-colors" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-secondary font-label">Risk Level</label>
                      <select className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-tertiary transition-colors">
                        <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-5 border-t border-border flex justify-end gap-3 bg-surface rounded-b-2xl">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-secondary hover:text-primary hover:bg-background transition-colors">
                Cancel
              </button>
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-bold bg-tertiary hover:bg-tertiary/90 text-primary-foreground transition-colors shadow-sm">
                {registerMode === "server" ? "Submit Server" : "Submit Application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
