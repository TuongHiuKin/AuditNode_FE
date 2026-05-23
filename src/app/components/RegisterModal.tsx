import { X } from "lucide-react";
import { useState } from "react";

const inputCls = "w-full bg-background border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-tertiary transition-colors font-body";
const selectCls = "w-full bg-background border border-border rounded-lg px-3 py-2.5 text-primary text-sm focus:outline-none focus:border-tertiary transition-colors font-body";
const labelCls = "block text-sm font-medium text-secondary mb-1.5 font-label uppercase tracking-wider";

export interface RegisterModalProps {
  onClose: () => void;
  servers?: { id: string; hostname: string; ipAddress: string }[];
  defaultMode?: "infra" | "app";
}

export function RegisterModal({ onClose, servers = [], defaultMode = "infra" }: RegisterModalProps) {
  const [formMode, setFormMode] = useState<"infra" | "app">(defaultMode);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex justify-between items-center rounded-t-2xl bg-surface">
          <h3 className="text-lg font-bold text-primary font-display">Register New Entity</h3>
          <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 pt-5 pb-2">
          <div className="flex p-1 bg-background rounded-lg border border-border">
            <button
              onClick={() => setFormMode("infra")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                formMode === "infra"
                  ? "bg-surface text-primary shadow-sm border border-border"
                  : "text-secondary hover:text-primary"
              }`}
            >
              New Infrastructure
            </button>
            <button
              onClick={() => setFormMode("app")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                formMode === "app"
                  ? "bg-surface text-primary shadow-sm border border-border"
                  : "text-secondary hover:text-primary"
              }`}
            >
              App Deployment
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 pt-4">
          {formMode === "infra" ? (
            <>
              <div>
                <label className={labelCls}>Zone / Datacenter</label>
                <select className={selectCls}>
                  <option>Corporate Datacenter</option>
                  <option>DMZ (Public Facing)</option>
                  <option>AWS us-east-1</option>
                  <option>Azure Edge</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Server IP</label>
                  <input type="text" placeholder="e.g. 10.0.x.x" className={`${inputCls} font-label`} />
                </div>
                <div>
                  <label className={labelCls}>Hostname</label>
                  <input type="text" placeholder="e.g. web-node-01" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>OS Type</label>
                  <select className={selectCls}>
                    <option>Ubuntu 22.04</option>
                    <option>RHEL 8</option>
                    <option>CentOS 7</option>
                    <option>Windows Server 2022</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Environment</label>
                  <select className={selectCls}>
                    <option>Production</option>
                    <option>Staging</option>
                    <option>Development</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelCls}>Select Server</label>
                <select className={selectCls}>
                  <option value="">Select existing server...</option>
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.hostname} — {s.ipAddress}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className={labelCls}>App Code</label>
                  <input type="text" placeholder="PAY-01" className={`${inputCls} uppercase font-label`} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Application Name</label>
                  <input type="text" placeholder="e.g. Payment Gateway" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Port</label>
                  <input type="number" placeholder="443" className={`${inputCls} font-label`} />
                </div>
                <div>
                  <label className={labelCls}>Protocol</label>
                  <select className={selectCls}>
                    <option>HTTPS</option>
                    <option>TCP</option>
                    <option>UDP</option>
                    <option>HTTP</option>
                    <option>gRPC</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-border flex justify-end gap-3 rounded-b-2xl bg-surface">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-secondary hover:text-primary hover:bg-background transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-tertiary hover:bg-tertiary/90 text-primary-foreground transition-colors shadow-sm"
          >
            {formMode === "infra" ? "Submit Server" : "Deploy Application"}
          </button>
        </div>
      </div>
    </div>
  );
}
