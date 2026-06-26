import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Server, X } from "lucide-react";
import { toast } from "sonner";
import apiClient, { Schemas } from "../../shared/api/client";
import { useHeader } from "../hooks/useHeader";

export function DatacentersPage() {
  const { setHeader } = useHeader();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setHeader(
      ["INFRASTRUCTURE", "DATACENTERS"],
      "Datacenter Management",
      "Manage physical and virtual datacenter zones.",
      <Server size={20} />
    );
  }, [setHeader]);

  const { data: datacenters = [], isLoading } = useQuery({
    queryKey: ["datacenters"],
    queryFn: async () => {
      const response = await apiClient.get<Schemas["Datacenter"][]>("/api/v1/datacenters");
      const rawData = response as any;
      return Array.isArray(rawData.data) ? rawData.data : (rawData.data?.data || []);
    },
  });

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/api/v1/datacenters/${id}`);
      toast.success("Datacenter deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["datacenters"] });
    } catch (err: any) {
      if (err.response?.status === 403) {
        toast.error("Access Denied: Admin privileges required");
      } else {
        toast.error(err.response?.data?.message || "Failed to delete datacenter");
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background font-body p-6 gap-4">
      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-xl font-bold text-foreground font-display">Datacenters</h2>
        {/* Unhidden Add Datacenter Button - available to any logged-in user */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 h-9 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-[0_0_24px_oklch(0.62_0.22_25/0.35)]"
        >
          <Plus size={16} />
          Add Datacenter
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-panel border border-border rounded-xl shadow-sm p-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : datacenters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
            <Server size={32} className="opacity-20 mb-3" />
            No datacenters found.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-border text-xs uppercase tracking-widest text-muted-foreground font-mono">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datacenters.map((dc: any) => (
                <tr key={dc.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors group">
                  <td className="px-4 py-3 text-sm text-foreground font-medium">{dc.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{dc.location}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(dc.id)}
                      className="text-xs text-danger/70 hover:text-danger font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <CreateDatacenterModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["datacenters"] });
          }}
        />
      )}
    </div>
  );
}

function CreateDatacenterModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Intentionally omitting userId, backend handles extraction securely from token via authenticated apiClient
      await apiClient.post("/api/v1/datacenters", { name, location });
      toast.success("Datacenter created successfully");
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

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-border">
          <h3 className="text-xl font-bold text-foreground font-display">Add Datacenter</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs text-muted-foreground font-bold tracking-widest uppercase">
                Datacenter Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. US-East-1"
                className="w-full bg-background text-foreground border border-border rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs text-muted-foreground font-bold tracking-widest uppercase">
                Location
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Virginia, USA"
                className="w-full bg-background text-foreground border border-border rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm px-6 py-2 rounded-lg transition-all shadow-[0_0_15px_oklch(0.62_0.22_25/0.2)] disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
