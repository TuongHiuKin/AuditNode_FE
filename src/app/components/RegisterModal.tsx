import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient, { Schemas } from "../../shared/api/client";

const inputCls = "w-full bg-[#0b1120] border border-gray-800 text-gray-200 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";
const labelCls = "text-sm font-medium text-gray-300";

export interface RegisterModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  servers?: { id: string; hostname: string; ipAddress: string }[];
  defaultMode?: "infra" | "app";
}

export function RegisterModal({ onClose, onSuccess, servers = [], defaultMode = "infra" }: RegisterModalProps) {
  const [formMode, setFormMode] = useState<"infra" | "app">(defaultMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch Datacenters ──────────────────────────────────────────────────────────────────
  const { data: datacenters = [] } = useQuery({
    queryKey: ["datacenters"],
    queryFn: async () => {
      const response = await apiClient.get<Schemas["Datacenter"][]>("/api/v1/datacenters");
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  // ── Fetch Servers (Dynamic Fetch) ────────────────────────────────────────────────────────
  const [availableServers, setAvailableServers] = useState<Schemas["ServerResponseDto"][]>([]);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await apiClient.get<Schemas["ServerResponseDto"][]>("/api/v1/servers");
        if (Array.isArray(response.data)) {
          setAvailableServers(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch servers:", err);
      }
    };
    fetchServers();
  }, []);

  // Form State
  const [infraData, setInfraData] = useState({
    datacenterId: "",
    ipAddress: "",
    hostname: "",
    osType: "",
    environment: "Production",
    status: "Active"
  });

  const [appData, setAppData] = useState({
    serverId: "",
    appCode: "",
    appName: "",
    ownerTeam: "",
    portNumber: 443,
    protocol: "HTTPS",
  });

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (formMode === "infra") {
        if (!infraData.datacenterId || !infraData.ipAddress || !infraData.hostname || !infraData.osType) {
          throw new Error("Datacenter, IP Address, Hostname, and OS Type are required");
        }
        await apiClient.post("/api/v1/servers", infraData);
      } else {
        if (!appData.serverId || !appData.appCode || !appData.appName || !appData.ownerTeam) {
          throw new Error("Server, App Code, App Name, and Owner Team are required");
        }
        await apiClient.post("/api/v1/applications", appData);
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to register entity");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4" onClick={onClose}>
      <div
        id="register-modal-wrapper"
        className="bg-[#0f172a] border border-gray-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ minWidth: '420px' }}
        onClick={(e) => e.stopPropagation()}
      >
          {/* ── Modal Header ── */}
          <div className="flex justify-between items-center p-5 border-b border-gray-800">
            <h3 className="text-xl font-bold text-white">Register New Entity</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors focus:outline-none">
              <X size={24} />
            </button>
          </div>

          {/* ── Tab Switcher ── */}
          <div className="px-5 pt-5">
            <div className="flex flex-row bg-[#111827] border border-gray-800 rounded-lg p-1">
              <button
                onClick={() => setFormMode("infra")}
                className={`flex-1 py-2 text-center text-sm font-medium rounded-md transition-colors ${
                  formMode === "infra"
                    ? "bg-[#1f2937] text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                New Server
              </button>
              <button
                onClick={() => setFormMode("app")}
                className={`flex-1 py-2 text-center text-sm font-medium rounded-md transition-colors ${
                  formMode === "app"
                    ? "bg-[#1f2937] text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                New Application
              </button>
            </div>
          </div>

          {/* ── Form Body ── */}
          <div className="p-5 flex flex-col gap-5">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {formMode === "infra" ? (
              <div className="flex flex-col gap-5">
                {/* Zone / Datacenter */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="datacenterId" className={labelCls}>Zone / Datacenter</label>
                  <select
                    id="datacenterId"
                    className={inputCls}
                    value={infraData.datacenterId}
                    onChange={(e) => setInfraData({ ...infraData, datacenterId: e.target.value })}
                  >
                    <option value="" className="bg-[#0b1120]">Select Datacenter...</option>
                    {datacenters.map(dc => (
                      <option key={dc.id} value={dc.id} className="bg-[#0b1120]">{dc.name} ({dc.location})</option>
                    ))}
                  </select>
                </div>

                {/* Server IP + Hostname */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="ipAddress" className={labelCls}>Server IP</label>
                    <input
                      id="ipAddress"
                      type="text"
                      placeholder="e.g. 10.0.x.x"
                      className={inputCls}
                      value={infraData.ipAddress}
                      onChange={(e) => setInfraData({ ...infraData, ipAddress: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
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

                {/* OS Type + Environment */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="osType" className={labelCls}>OS Type</label>
                    <input
                      id="osType"
                      type="text"
                      placeholder="e.g. Ubuntu 22.04"
                      className={inputCls}
                      value={infraData.osType}
                      onChange={(e) => setInfraData({ ...infraData, osType: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="environment" className={labelCls}>Environment</label>
                    <select
                      id="environment"
                      className={inputCls}
                      value={infraData.environment}
                      onChange={(e) => setInfraData({ ...infraData, environment: e.target.value })}
                    >
                      <option className="bg-[#0b1120]">Production</option>
                      <option className="bg-[#0b1120]">Staging</option>
                      <option className="bg-[#0b1120]">Development</option>
                    </select>
                  </div>
                </div>

                {/* Initial Status */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="status" className={labelCls}>Initial Status</label>
                  <select
                    id="status"
                    className={inputCls}
                    value={infraData.status}
                    onChange={(e) => setInfraData({ ...infraData, status: e.target.value })}
                  >
                    <option className="bg-[#0b1120]">Active</option>
                    <option className="bg-[#0b1120]">Inactive</option>
                    <option className="bg-[#0b1120]">Maintenance</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Server + Owner */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="serverId" className={labelCls}>Select Server</label>
                    <select
                      id="serverId"
                      className={inputCls}
                      value={appData.serverId}
                      onChange={(e) => setAppData({ ...appData, serverId: e.target.value })}
                    >
                      <option value="" className="bg-[#0b1120]">Select server...</option>
                      {availableServers.map((s) => (
                        <option key={s.id} value={s.id} className="bg-[#0b1120]">
                          {s.hostname} ({s.ipAddress})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="ownerTeam" className={labelCls}>Owner Team</label>
                    <input
                      id="ownerTeam"
                      type="text"
                      placeholder="e.g. FinOps Team"
                      className={inputCls}
                      value={appData.ownerTeam}
                      onChange={(e) => setAppData({ ...appData, ownerTeam: e.target.value })}
                    />
                  </div>
                </div>

                {/* App Code + App Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="appCode" className={labelCls}>App Code</label>
                    <input
                      id="appCode"
                      type="text"
                      placeholder="PAY-01"
                      className={inputCls}
                      value={appData.appCode}
                      onChange={(e) => setAppData({ ...appData, appCode: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
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

                {/* Port + Protocol */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="portNumber" className={labelCls}>Port</label>
                    <input
                      id="portNumber"
                      type="number"
                      placeholder="443"
                      className={inputCls}
                      value={appData.portNumber}
                      onChange={(e) => setAppData({ ...appData, portNumber: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="protocol" className={labelCls}>Protocol</label>
                    <select
                      id="protocol"
                      className={inputCls}
                      value={appData.protocol}
                      onChange={(e) => setAppData({ ...appData, protocol: e.target.value })}
                    >
                      <option className="bg-[#0b1120]">HTTPS</option>
                      <option className="bg-[#0b1120]">TCP</option>
                      <option className="bg-[#0b1120]">UDP</option>
                      <option className="bg-[#0b1120]">HTTP</option>
                      <option className="bg-[#0b1120]">gRPC</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Modal Footer ── */}
          <div className="flex justify-end items-center gap-4 p-5 border-t border-gray-800">
            <button
              onClick={onClose}
              disabled={loading}
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-5 rounded-lg transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 active:scale-95"
            >
              {loading ? "Submitting..." : (formMode === "infra" ? "Submit Server" : "Deploy App")}
            </button>
          </div>
        </div>
      </div>,
    document.body
  );
}
