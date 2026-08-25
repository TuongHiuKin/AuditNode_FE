import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient, { Schemas } from "../../shared/api/client";
import { useWorkspace } from "../../shared/workspace/WorkspaceContext";
import { tenantQueryKey } from "../../shared/workspace/workspaceStore";
import { API_ENDPOINTS } from "../../config/endpoints";
import { ServerService } from "../../services/serverService";
import { ApplicationService } from "../../services/applicationService";
import { isNonEmptyIdentifier, type CreateApplicationRequest } from "../../shared/api/applicationTypes";

const inputCls = "w-full bg-background border border-border text-foreground text-sm rounded-lg p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all";
const labelCls = "text-sm font-medium text-muted-foreground";

export interface RegisterModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  servers?: { id: string; hostname: string; ipAddress: string }[];
  defaultMode?: "infra" | "app" | "datacenter";
}

export function RegisterModal({ onClose, onSuccess, servers = [], defaultMode = "infra" }: RegisterModalProps) {
  const { selectedWorkspaceId } = useWorkspace();
  const [formMode, setFormMode] = useState<"infra" | "app" | "datacenter">(defaultMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch Datacenters ──────────────────────────────────────────────────────────────────
  const { data: datacenters = [] } = useQuery({
    queryKey: tenantQueryKey("datacenters", selectedWorkspaceId),
    queryFn: async () => {
      const response = await apiClient.get<Schemas["DatacenterDto"][]>("/api/v1/datacenters");
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!selectedWorkspaceId,
  });

  // ── Fetch Servers (Dynamic Fetch) ────────────────────────────────────────────────────────
  const [availableServers, setAvailableServers] = useState<Schemas["ServerResponseDto"][]>([]);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setAvailableServers([]);
      return;
    }
    const fetchServers = async () => {
      try {
        setAvailableServers(await ServerService.getServers());
      } catch (err) {
        console.error("Failed to fetch servers:", err);
      }
    };
    fetchServers();
  }, [selectedWorkspaceId]);

  // Form State
  const [infraData, setInfraData] = useState<{
    datacenterId: string;
    ipAddress: string;
    hostname: string;
    osType: string;
    environment: string;
    status: string;
    labels: { key: string; value: string }[];
  }>({
    datacenterId: "",
    ipAddress: "",
    hostname: "",
    osType: "",
    environment: "Production",
    status: "Active",
    labels: []
  });

  const [appData, setAppData] = useState<{
    serverId: string;
    appCode: string;
    appName: string;
    ownerTeam: string;
    portNumber: number;
    protocol: string;
    labels: { key: string; value: string }[];
  }>({
    serverId: "",
    appCode: "",
    appName: "",
    ownerTeam: "",
    portNumber: 443,
    protocol: "HTTPS",
    labels: []
  });

  const [dcData, setDcData] = useState<{
    name: string;
    location: string;
  }>({
    name: "",
    location: "",
  });

  const [labelInput, setLabelInput] = useState({ key: "", value: "" });

  const handleAddLabel = (mode: "infra" | "app") => {
    if (!labelInput.key.trim() || !labelInput.value.trim()) return;
    const newLabel = { key: labelInput.key.trim(), value: labelInput.value.trim() };
    if (mode === "infra") {
      setInfraData(prev => ({ ...prev, labels: [...prev.labels, newLabel] }));
    } else {
      setAppData(prev => ({ ...prev, labels: [...prev.labels, newLabel] }));
    }
    setLabelInput({ key: "", value: "" });
  };

  const handleRemoveLabel = (mode: "infra" | "app", index: number) => {
    if (mode === "infra") {
      setInfraData(prev => ({ ...prev, labels: prev.labels.filter((_, i) => i !== index) }));
    } else {
      setAppData(prev => ({ ...prev, labels: prev.labels.filter((_, i) => i !== index) }));
    }
  };

  const renderLabelsSection = (mode: "infra" | "app", currentLabels: { key: string; value: string }[]) => (
    <div className="flex flex-col gap-3 pt-5 border-t border-border mt-1">
      <label className={labelCls}>Labels / Tags</label>
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Key (e.g. Env)"
          className={`flex-1 ${inputCls}`}
          value={labelInput.key}
          onChange={(e) => setLabelInput({ ...labelInput, key: e.target.value })}
        />
        <input
          type="text"
          placeholder="Value (e.g. Prod)"
          className={`flex-1 ${inputCls}`}
          value={labelInput.value}
          onChange={(e) => setLabelInput({ ...labelInput, value: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddLabel(mode))}
        />
        <button
          type="button"
          onClick={() => handleAddLabel(mode)}
          className="bg-background border border-border hover:bg-surface-hover text-foreground text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
        >
          Add
        </button>
      </div>
      {currentLabels.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {currentLabels.map((lbl, idx) => (
            <div key={idx} className="flex items-center bg-background border border-border rounded-lg px-3 py-1.5 gap-2">
              <span className="font-label text-xs text-foreground uppercase tracking-wide">
                <span className="text-muted-foreground">{lbl.key}:</span> {lbl.value}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveLabel(mode, idx)}
                className="text-muted-foreground hover:text-foreground outline-none transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (formMode === "infra") {
        if (!infraData.datacenterId || !infraData.ipAddress || !infraData.hostname || !infraData.osType) {
          throw new Error("Datacenter, IP Address, Hostname, and OS Type are required");
        }
        await ServerService.createServer(infraData);
      } else if (formMode === "app") {
        if (!appData.appCode || !appData.appName || !appData.ownerTeam) {
          throw new Error("App Code, App Name, and Owner Team are required");
        }
        const payload: CreateApplicationRequest = {
          appCode: appData.appCode,
          appName: appData.appName,
          ownerTeam: appData.ownerTeam,
          labels: appData.labels,
        };
        if (appData.serverId) {
          if (!isNonEmptyIdentifier(appData.serverId)) {
            throw new Error("A non-empty deployment server identifier is required.");
          }
          payload.deployment = {
            serverId: appData.serverId,
            portNumber: Number(appData.portNumber),
            protocol: appData.protocol,
          };
        }
        await ApplicationService.createApplication(payload);
      } else if (formMode === "datacenter") {
        if (!dcData.name || !dcData.location) {
          throw new Error("Datacenter Name and Location are required");
        }
        await apiClient.post(API_ENDPOINTS.DATACENTERS.BASE, dcData);
      }
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      if (getResponseStatus(err) === 403) {
        setError("Access Denied: Admin privileges required");
      } else {
        setError(getErrorMessage(err, "Failed to register entity"));
      }
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4" onClick={onClose}>
      <div
        id="register-modal-wrapper"
        className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ minWidth: '420px' }}
        onClick={(e) => e.stopPropagation()}
      >
          {/* ── Modal Header ── */}
          <div className="flex justify-between items-center p-5 border-b border-border">
            <h3 className="text-xl font-bold text-foreground font-display">Register New Entity</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none">
              <X size={24} />
            </button>
          </div>

          {/* ── Tab Switcher ── */}
          <div className="px-5 pt-5">
            <div className="flex flex-row bg-panel border border-border rounded-lg p-1">
              <button
                onClick={() => setFormMode("infra")}
                className={`flex-1 py-2 text-center text-sm font-medium rounded-md transition-colors ${
                  formMode === "infra"
                    ? "bg-surface-hover text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                New Server
              </button>
              <button
                onClick={() => setFormMode("app")}
                className={`flex-1 py-2 text-center text-sm font-medium rounded-md transition-colors ${
                  formMode === "app"
                    ? "bg-surface-hover text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                New Application
              </button>
              <button
                onClick={() => setFormMode("datacenter")}
                className={`flex-1 py-2 text-center text-sm font-medium rounded-md transition-colors ${
                  formMode === "datacenter"
                    ? "bg-surface-hover text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                New Datacenter
              </button>
            </div>
          </div>

          {/* ── Form Body ── */}
          <div className="p-5 flex flex-col gap-5">
            {error && (
              <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                {error}
              </div>
            )}

            {formMode === "infra" && (
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
                    <option value="" className="bg-background">Select Datacenter...</option>
                    {datacenters.map(dc => (
                      <option key={dc.id} value={dc.id} className="bg-background">{dc.name} ({dc.location})</option>
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
                      <option className="bg-background">Production</option>
                      <option className="bg-background">Staging</option>
                      <option className="bg-background">Development</option>
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
                    <option className="bg-background">Active</option>
                    <option className="bg-background">Inactive</option>
                    <option className="bg-background">Maintenance</option>
                  </select>
                </div>

                {renderLabelsSection("infra", infraData.labels)}
              </div>
            )}

            {formMode === "app" && (
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
                      <option value="" className="bg-background">Select server...</option>
                      {availableServers.map((s) => (
                        <option key={s.id} value={s.id} className="bg-background">
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
                      <option className="bg-background">HTTPS</option>
                      <option className="bg-background">TCP</option>
                      <option className="bg-background">UDP</option>
                      <option className="bg-background">HTTP</option>
                      <option className="bg-background">gRPC</option>
                    </select>
                  </div>
                </div>

                {renderLabelsSection("app", appData.labels)}
              </div>
            )}

            {formMode === "datacenter" && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="dcName" className={labelCls}>Datacenter Name</label>
                  <input
                    id="dcName"
                    type="text"
                    placeholder="e.g. US-East-1"
                    className={inputCls}
                    value={dcData.name}
                    onChange={(e) => setDcData({ ...dcData, name: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="dcLocation" className={labelCls}>Location</label>
                  <input
                    id="dcLocation"
                    type="text"
                    placeholder="e.g. Virginia, USA"
                    className={inputCls}
                    value={dcData.location}
                    onChange={(e) => setDcData({ ...dcData, location: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Modal Footer ── */}
          <div className="flex justify-end items-center gap-4 p-5 border-t border-border">
            <button
              onClick={onClose}
              disabled={loading}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium py-2 px-5 rounded-lg transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95"
            >
              {loading ? "Submitting..." : (formMode === "infra" ? "Submit Server" : formMode === "app" ? "Deploy App" : "Create Datacenter")}
            </button>
          </div>
        </div>
      </div>,
    document.body
  );
}

function getResponseStatus(error: unknown): number | undefined {
  if (!isRecord(error) || !isRecord(error.response)) return undefined;
  return typeof error.response.status === "number" ? error.response.status : undefined;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (!isRecord(error) || !isRecord(error.response) || !isRecord(error.response.data)) return fallback;
  return typeof error.response.data.message === "string" ? error.response.data.message : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
