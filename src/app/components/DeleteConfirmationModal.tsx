import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, X, Loader2, Info, ShieldAlert, Box } from "lucide-react";
import { toast } from "sonner";
import apiClient from "../../shared/api/client";

interface DeleteConfirmationModalProps {
  entityId: string | null;
  entityName: string | null;
  entityType: "SERVER" | "APP" | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface DeployedApp {
  id: string;
  appName: string;
  portNumber: number;
}

export function DeleteConfirmationModal({
  entityId,
  entityName,
  entityType,
  onClose,
  onSuccess,
}: DeleteConfirmationModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [dependencyCount, setDependencyCount] = useState<number | null>(null);
  const [deployedApps, setDeployedApps] = useState<DeployedApp[]>([]);
  const [purging, setPurging] = useState(false);

  const isOpen = !!entityId;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (entityType === "APP") {
        fetchDependencyCount();
      } else if (entityType === "SERVER") {
        fetchDeployedApps();
      }
    } else {
      setDependencyCount(null);
      setDeployedApps([]);
    }
  }, [entityId, isOpen, entityType]);

  const fetchDependencyCount = async () => {
    if (!entityId) return;
    setLoadingImpact(true);
    try {
      const response = await apiClient.get<any>(`/api/v1/infrastructure/apps/${entityId}/dependencies-count`);
      const rawData = response.data ?? response;
      
      let parsedCount = 0;
      if (typeof rawData === 'number') {
        parsedCount = rawData;
      } else if (typeof rawData === 'string') {
        parsedCount = parseInt(rawData, 10);
      } else if (rawData && typeof rawData.count !== 'undefined') {
        parsedCount = Number(rawData.count);
      }

      setDependencyCount(isNaN(parsedCount) ? 0 : parsedCount);
    } catch (error) {
      console.error("Failed to fetch dependency count", error);
      setDependencyCount(0);
    } finally {
      setLoadingImpact(false);
    }
  };

  const fetchDeployedApps = async () => {
    if (!entityId) return;
    setLoadingImpact(true);
    try {
      const response = await apiClient.get<DeployedApp[]>(`/api/v1/infrastructure/servers/${entityId}/deployed-apps`);
      const rawResponse = response as any;
      const data = Array.isArray(rawResponse.data) ? rawResponse.data : (rawResponse.data?.data || []);
      setDeployedApps(data);
    } catch (error) {
      console.error("Failed to fetch deployed apps", error);
      setDeployedApps([]);
    } finally {
      setLoadingImpact(false);
    }
  };

  const handlePurge = async () => {
    if (!entityId || !entityType) return;
    
    setPurging(true);
    try {
      const endpoint = entityType === "APP" 
        ? `/api/v1/infrastructure/apps/${entityId}/purge`
        : `/api/v1/infrastructure/servers/${entityId}/purge`;
        
      await apiClient.delete(endpoint);
      toast.success(`${entityType === "APP" ? "Application" : "Server"} purged successfully`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to purge ${entityType.toLowerCase()}`);
    } finally {
      setPurging(false);
    }
  };

  if (!mounted || !isOpen) return null;

  const hasImpact = (entityType === "APP" && dependencyCount != null && dependencyCount > 0) || 
                   (entityType === "SERVER" && deployedApps.length > 0);

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      {/* Modal card */}
      <div
        className="bg-surface border border-danger/20 rounded-2xl shadow-2xl"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "460px",
          overflow: "hidden",
          animation: "deleteModalIn 0.2s ease-out forwards",
          boxShadow: "0 0 0 1px oklch(0.62 0.22 25 / 0.08), 0 24px 64px rgba(0,0,0,0.6), 0 0 40px oklch(0.62 0.22 25 / 0.06)",
        }}
      >
        {/* Top accent bar */}
        <div className="h-[3px] bg-gradient-to-r from-primary to-warning" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center bg-danger/12 rounded-[10px] border border-danger/20 text-danger">
              <Trash2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight font-display">
                Hard Delete {entityType === "SERVER" ? "Server" : "Application"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {entityName || "Resource"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-surface-hover p-1.5 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loadingImpact ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
              <Loader2 size={24} className="animate-spin text-primary" />
              <p className="text-[13px]">Analyzing infrastructure impact...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Impact Banner */}
              {hasImpact ? (
                <div className="flex flex-col gap-3.5 p-4 bg-danger/8 border border-danger/20 rounded-xl">
                  <div className="flex gap-3">
                    <ShieldAlert size={22} className="text-danger shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-bold text-danger tracking-wider uppercase mb-1 font-label">
                        Critical Impact Warning
                      </p>
                      <p className="text-[13px] text-foreground/80 leading-relaxed">
                        {entityType === "APP" ? (
                          <>
                            This application has <span className="font-bold text-foreground">{dependencyCount} active network connection{dependencyCount !== 1 ? "s" : ""}</span>.
                            Purging will permanently sever all linked dependencies.
                          </>
                        ) : (
                          <>
                            Warning: This server is actively hosting <span className="font-bold text-foreground">{deployedApps.length} application{deployedApps.length !== 1 ? "s" : ""}</span>. 
                            Deleting it will permanently purge the server and cascade-delete the following network deployments:
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {entityType === "SERVER" && deployedApps.length > 0 && (
                    <div className="mt-1 p-3 bg-background/30 rounded-lg border border-danger/10">
                      <ul className="m-0 p-0 list-none grid grid-cols-1 gap-2">
                        {deployedApps.map(app => (
                          <li key={app.id} className="flex items-center gap-2 text-xs text-foreground">
                            <Box size={14} className="text-danger" />
                            <span className="font-semibold">{app.appName}</span>
                            <span className="text-muted-foreground text-[11px] font-label">(Port {app.portNumber})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex gap-3.5 p-4 bg-primary/5 border border-primary/15 rounded-xl">
                  <Info size={22} className="text-primary shrink-0 mt-0.5" />
                  <p className="text-[13px] text-foreground/80 leading-relaxed">
                    Are you sure you want to permanently delete{" "}
                    <span className="font-bold text-foreground">{entityName || "this resource"}</span>?
                    {entityType === "SERVER" ? " This server is currently empty." : " This resource has no active dependencies."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-2.5 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-[10px] border border-border bg-surface-hover/30 text-[13px] font-semibold text-muted-foreground hover:bg-surface-hover hover:text-foreground cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={purging || loadingImpact}
            onClick={handlePurge}
            className={`flex-1 py-2.5 px-4 rounded-[10px] border-none text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${
              !purging
                ? "bg-gradient-to-br from-primary to-danger text-primary-foreground cursor-pointer shadow-[0_4px_16px_oklch(0.62_0.22_25/0.3)]"
                : "bg-surface-hover text-muted-foreground cursor-not-allowed"
            }`}
          >
            {purging ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Purging...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Confirm Delete
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes deleteModalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body
  );
}
