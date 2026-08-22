import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { toast } from "sonner";
import apiClient from "../../shared/api/client";
import { API_ENDPOINTS } from "../../config/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "../../shared/workspace/WorkspaceContext";
import { tenantQueryKey } from "../../shared/workspace/workspaceStore";

export function CreateDatacenterModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { selectedWorkspaceId } = useWorkspace();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await apiClient.post(API_ENDPOINTS.DATACENTERS.BASE, { name: name.trim(), location: location.trim() });
      toast.success("Datacenter created successfully");
      queryClient.invalidateQueries({ queryKey: tenantQueryKey("datacenters", selectedWorkspaceId) });
      onSuccess();
    } catch (err: any) {
      if (err.response?.status === 403) {
        const msg = "Access Denied: Admin privileges required";
        toast.error(msg);
        setError(msg);
      } else {
        setError(err.response?.data?.message || "Failed to create datacenter");
      }
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "var(--color-surface, #141828)",
          border: "1px solid var(--color-border, #2a2e42)",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "420px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px",
            borderBottom: "1px solid var(--color-border, #2a2e42)",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--color-foreground, #F2F2F5)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Add Datacenter
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-muted-foreground, #6b7280)",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div
              style={{
                padding: "12px",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "8px",
                color: "#ef4444",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          {/* Datacenter Name */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--color-muted-foreground, #6b7280)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Datacenter Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HN-DC-01"
              style={{
                width: "100%",
                backgroundColor: "var(--color-background, #0B0E1A)",
                color: "var(--color-foreground, #F2F2F5)",
                border: "1px solid var(--color-border, #2a2e42)",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Location */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--color-muted-foreground, #6b7280)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Location
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Hanoi, Vietnam"
              style={{
                width: "100%",
                backgroundColor: "var(--color-background, #0B0E1A)",
                color: "var(--color-foreground, #F2F2F5)",
                border: "1px solid var(--color-border, #2a2e42)",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "12px",
              paddingTop: "12px",
              borderTop: "1px solid var(--color-border, #2a2e42)",
              marginTop: "4px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--color-muted-foreground, #6b7280)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !location.trim()}
              style={{
                padding: "8px 20px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#fff",
                backgroundColor: loading || !name.trim() || !location.trim() ? "#6b4350" : "#FF4D7E",
                border: "none",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading || !name.trim() || !location.trim() ? 0.6 : 1,
              }}
            >
              {loading ? "Creating..." : "Create Datacenter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
