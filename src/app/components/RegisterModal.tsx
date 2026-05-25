import { X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient, { Schemas } from "../../shared/api/client";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch Datacenters ──────────────────────────────────────────────────────
  const { data: datacenters = [] } = useQuery({
    queryKey: ["datacenters"],
    queryFn: async () => {
      const response = await apiClient.get<Schemas["Datacenter"][]>("/api/Datacenters");
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  // Form State
  const [infraData, setInfraData] = useState({
    datacenterId: "",
    ipAddress: "",
    hostname: "",
    osType: "Ubuntu 22.04",
    environment: "Production",
    status: "Active"
  });

  const [appData, setAppData] = useState({
    serverId: "",
    appCode: "",
    appName: "",
    ownerId: "",
    portNumber: 443,
    protocol: "HTTPS",
  });

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (formMode === "infra") {
        if (!infraData.datacenterId || !infraData.ipAddress || !infraData.hostname) {
          throw new Error("Datacenter, IP Address, and Hostname are required");
        }
        await apiClient.post("/api/Servers", infraData);
      } else {
        if (!appData.serverId || !appData.appCode || !appData.appName || !appData.ownerId) {
          throw new Error("Server, App Code, App Name, and Owner ID are required");
        }
        await apiClient.post("/api/Applications", appData);
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to register entity");
    } finally {
      setLoading(false);
    }
  };

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

        {/* Error Message */}
        {error && (
          <div className="px-6 pt-4">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs">
              {error}
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-4 pt-4">
          {formMode === "infra" ? (
            <>
              <div>
                <label htmlFor="datacenterId" className={labelCls}>Zone / Datacenter</label>
                <select 
                  id="datacenterId"
                  className={selectCls}
                  value={infraData.datacenterId}
                  onChange={(e) => setInfraData({ ...infraData, datacenterId: e.target.value })}
                >
                  <option value="">Select Datacenter...</option>
                  {datacenters.map(dc => (
                    <option key={dc.id} value={dc.id}>{dc.name} ({dc.location})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ipAddress" className={labelCls}>Server IP</label>
                  <input 
                    id="ipAddress"
                    type="text" 
                    placeholder="e.g. 10.0.x.x" 
                    className={`${inputCls} font-label`} 
                    value={infraData.ipAddress}
                    onChange={(e) => setInfraData({ ...infraData, ipAddress: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="hostname" className={labelCls}>Hostname</label>
                  <input 
                    id="hostname"
                    type="text" 
                    placeholder="e.g. web-node-01" 
                    className={inputCls} 
                    value={infraData.hostname}
                    onChange={(e) => setInfraData({ ...infraData, hostname: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="osType" className={labelCls}>OS Type</label>
                  <select 
                    id="osType"
                    className={selectCls}
                    value={infraData.osType}
                    onChange={(e) => setInfraData({ ...infraData, osType: e.target.value })}
                  >
                    <option>Ubuntu 22.04</option>
                    <option>RHEL 8</option>
                    <option>CentOS 7</option>
                    <option>Windows Server 2022</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="environment" className={labelCls}>Environment</label>
                  <select 
                    id="environment"
                    className={selectCls}
                    value={infraData.environment}
                    onChange={(e) => setInfraData({ ...infraData, environment: e.target.value })}
                  >
                    <option>Production</option>
                    <option>Staging</option>
                    <option>Development</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label htmlFor="serverId" className={labelCls}>Select Server</label>
                  <select 
                    id="serverId"
                    className={selectCls}
                    value={appData.serverId}
                    onChange={(e) => setAppData({ ...appData, serverId: e.target.value })}
                  >
                    <option value="">Select server...</option>
                    {servers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.hostname}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <label htmlFor="ownerId" className={labelCls}>Owner Team/ID</label>
                  <input 
                    id="ownerId"
                    type="text" 
                    placeholder="e.g. FinOps" 
                    className={inputCls} 
                    value={appData.ownerId}
                    onChange={(e) => setAppData({ ...appData, ownerId: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label htmlFor="appCode" className={labelCls}>App Code</label>
                  <input 
                    id="appCode"
                    type="text" 
                    placeholder="PAY-01" 
                    className={`${inputCls} uppercase font-label`} 
                    value={appData.appCode}
                    onChange={(e) => setAppData({ ...appData, appCode: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label htmlFor="appName" className={labelCls}>Application Name</label>
                  <input 
                    id="appName"
                    type="text" 
                    placeholder="e.g. Payment Gateway" 
                    className={inputCls} 
                    value={appData.appName}
                    onChange={(e) => setAppData({ ...appData, appName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="portNumber" className={labelCls}>Port</label>
                  <input 
                    id="portNumber"
                    type="number" 
                    placeholder="443" 
                    className={`${inputCls} font-label`} 
                    value={appData.portNumber}
                    onChange={(e) => setAppData({ ...appData, portNumber: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label htmlFor="protocol" className={labelCls}>Protocol</label>
                  <select 
                    id="protocol"
                    className={selectCls}
                    value={appData.protocol}
                    onChange={(e) => setAppData({ ...appData, protocol: e.target.value })}
                  >
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
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-secondary hover:text-primary hover:bg-background transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-tertiary hover:bg-tertiary/90 text-primary-foreground transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? "Submitting..." : (formMode === "infra" ? "Submit Server" : "Deploy Application")}
          </button>
        </div>
      </div>
    </div>
  );
}
