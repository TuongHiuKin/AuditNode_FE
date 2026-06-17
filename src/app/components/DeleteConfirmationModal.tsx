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
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "460px",
          backgroundColor: "#0c1322",
          border: "1px solid rgba(255,77,126,0.2)",
          borderRadius: "16px",
          boxShadow: "0 0 0 1px rgba(255,77,126,0.08), 0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(255,77,126,0.06)",
          overflow: "hidden",
          animation: "deleteModalIn 0.2s ease-out forwards",
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: "3px", background: "linear-gradient(90deg, #FF4D7E, #ff8a65)" }} />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid rgba(122,134,153,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,77,126,0.12)",
                borderRadius: "10px",
                border: "1px solid rgba(255,77,126,0.2)",
                color: "#FF4D7E",
              }}
            >
              <Trash2 size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#F2F2F5", lineHeight: 1.2 }}>
                Hard Delete {entityType === "SERVER" ? "Server" : "Application"}
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#7A8699" }}>
                {entityName || "Resource"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#7A8699",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px",
              borderRadius: "8px",
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#F2F2F5";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(122,134,153,0.1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#7A8699";
              (e.currentTarget as HTMLButtonElement).style.background = "none";
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {loadingImpact ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: "12px", color: "#7A8699" }}>
              <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#FF4D7E" }} />
              <p style={{ margin: 0, fontSize: "13px" }}>Analyzing infrastructure impact...</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Impact Banner */}
              {hasImpact ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    padding: "16px",
                    backgroundColor: "rgba(255,77,126,0.08)",
                    border: "1px solid rgba(255,77,126,0.2)",
                    borderRadius: "12px",
                  }}
                >
                  <div style={{ display: "flex", gap: "12px" }}>
                    <ShieldAlert size={22} style={{ color: "#FF4D7E", flexShrink: 0, marginTop: "1px" }} />
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 700, color: "#FF4D7E", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Critical Impact Warning
                      </p>
                      <p style={{ margin: 0, fontSize: "13px", color: "#c8d0de", lineHeight: 1.6 }}>
                        {entityType === "APP" ? (
                          <>
                            This application has <span style={{ fontWeight: 700, color: "#F2F2F5" }}>{dependencyCount} active network connection{dependencyCount !== 1 ? "s" : ""}</span>.
                            Purging will permanently sever all linked dependencies.
                          </>
                        ) : (
                          <>
                            Warning: This server is actively hosting <span style={{ fontWeight: 700, color: "#F2F2F5" }}>{deployedApps.length} application{deployedApps.length !== 1 ? "s" : ""}</span>. 
                            Deleting it will permanently purge the server and cascade-delete the following network deployments:
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {entityType === "SERVER" && deployedApps.length > 0 && (
                    <div style={{ 
                      marginTop: "4px",
                      padding: "12px",
                      backgroundColor: "rgba(0,0,0,0.2)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,77,126,0.1)"
                    }}>
                      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
                        {deployedApps.map(app => (
                          <li key={app.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#F2F2F5" }}>
                            <Box size={14} style={{ color: "#FF4D7E" }} />
                            <span style={{ fontWeight: 600 }}>{app.appName}</span>
                            <span style={{ color: "#7A8699", fontSize: "11px" }}>(Port {app.portNumber})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    gap: "14px",
                    padding: "16px",
                    backgroundColor: "rgba(59,130,246,0.07)",
                    border: "1px solid rgba(59,130,246,0.15)",
                    borderRadius: "12px",
                  }}
                >
                  <Info size={22} style={{ color: "#60a5fa", flexShrink: 0, marginTop: "1px" }} />
                  <p style={{ margin: 0, fontSize: "13px", color: "#c8d0de", lineHeight: 1.6 }}>
                    Are you sure you want to permanently delete{" "}
                    <span style={{ fontWeight: 700, color: "#F2F2F5" }}>{entityName || "this resource"}</span>?
                    {entityType === "SERVER" ? " This server is currently empty." : " This resource has no active dependencies."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            padding: "16px 24px 24px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "10px",
              border: "1px solid rgba(122,134,153,0.2)",
              backgroundColor: "rgba(122,134,153,0.08)",
              fontSize: "13px",
              fontWeight: 600,
              color: "#7A8699",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(122,134,153,0.15)";
              (e.currentTarget as HTMLButtonElement).style.color = "#F2F2F5";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(122,134,153,0.08)";
              (e.currentTarget as HTMLButtonElement).style.color = "#7A8699";
            }}
          >
            Cancel
          </button>
          <button
            disabled={purging || loadingImpact}
            onClick={handlePurge}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "10px",
              border: "none",
              fontSize: "13px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: !purging ? "pointer" : "not-allowed",
              transition: "all 0.15s",
              background: !purging
                ? "linear-gradient(135deg, #FF4D7E, #e0365e)"
                : "rgba(122,134,153,0.12)",
              color: !purging ? "#fff" : "#4a5568",
              boxShadow: !purging ? "0 4px 16px rgba(255,77,126,0.3)" : "none",
            }}
          >
            {purging ? (
              <>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
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
