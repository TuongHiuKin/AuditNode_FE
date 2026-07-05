import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import apiClient from "../../shared/api/client";
import { useQueryClient } from "@tanstack/react-query";

export function CreateDatacenterModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.post("/api/v1/datacenters", { name, location });
      toast.success("Datacenter created successfully");
      queryClient.invalidateQueries({ queryKey: ["datacenters"] });
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
