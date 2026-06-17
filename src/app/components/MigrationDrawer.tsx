import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { X, Loader2, Save, ChevronDown, MoveHorizontal } from "lucide-react";
import { toast } from "sonner";
import apiClient, { Schemas } from "../../shared/api/client";

interface MigrationDrawerProps {
  applicationId: string | null;
  onClose: () => void;
  onApplicationsUpdated: () => void;
  onServersUpdated: () => void;
}

interface MigrationForm {
  serverId: string;
  portNumber: number;
}

export function MigrationDrawer({
  applicationId,
  onClose,
  onApplicationsUpdated,
  onServersUpdated,
}: MigrationDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [servers, setServers] = useState<Schemas["ServerResponseDto"][]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, setValue } = useForm<MigrationForm>();

  const isOpen = !!applicationId;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchServers();
      fetchAppDetails();
    } else {
      reset();
    }
  }, [applicationId, isOpen]);

  const fetchServers = async () => {
    setLoadingServers(true);
    try {
      const response = await apiClient.get<Schemas["ServerResponseDto"][]>("/api/v1/servers");
      const rawResponse = response as any;
      const data = Array.isArray(rawResponse.data) ? rawResponse.data : (rawResponse.data?.data || []);
      setServers(data);
    } catch (error: any) {
      toast.error("Failed to fetch available servers");
    } finally {
      setLoadingServers(false);
    }
  };

  const fetchAppDetails = async () => {
    if (!applicationId) return;
    try {
      const response = await apiClient.get(`/api/v1/applications/${applicationId}`);
      const rawResponse = response as any;
      const data = rawResponse.data?.data ?? rawResponse.data;
      
      if (data.portNumber) setValue("portNumber", data.portNumber);
      if (data.serverId) setValue("serverId", data.serverId);
    } catch (error) {
      console.error("Error fetching app details for migration", error);
    }
  };

  const onSubmit = async (formData: MigrationForm) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        applicationId,
        serverId: formData.serverId,
        portNumber: Number(formData.portNumber),
      };

      await apiClient.put("/api/v1/infrastructure/apps/migrate", payload);
      
      toast.success("Deployment updated successfully");
      
      // Full state invalidation across domain boundaries
      onApplicationsUpdated();
      onServersUpdated();
      
      // Keep drawer open for continuous updates/corrections per UX mandate
      // onClose(); 
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[110] flex justify-end ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose} 
      />

      <div 
        className={`relative w-[450px] h-screen bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-tertiary/10 rounded-lg text-tertiary">
              <MoveHorizontal size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Edit Deployment</h2>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">
                MODIFY SERVER BINDING AND PORT SETTINGS
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <form id="migration-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white uppercase mb-2 tracking-widest">Target Server</label>
                <div className="relative">
                  <select 
                    {...register("serverId", { required: true })}
                    disabled={loadingServers}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Select a server...</option>
                    {servers.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.hostname} ({srv.ipAddress})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                {loadingServers && <p className="text-[10px] text-slate-500 mt-1 animate-pulse">Loading available infrastructure...</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-white uppercase mb-2 tracking-widest">Target Port Number</label>
                <input 
                  type="number"
                  {...register("portNumber", { required: true, min: 1, max: 65535 })}
                  placeholder="e.g. 8080"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none transition-all" 
                />
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
              <p className="text-xs text-blue-400 leading-relaxed">
                <span className="font-bold">Note:</span> Updating the server binding or port will automatically reposition this application on the Topology Map and recalculate its connected network flows.
              </p>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-lg border border-slate-700 text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-all">Cancel</button>
            <button 
              type="submit" 
              form="migration-form" 
              disabled={submitting || loadingServers} 
              className="flex-1 bg-tertiary hover:bg-tertiary/90 text-primary-foreground px-4 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,77,126,0.2)] disabled:opacity-50"
            >
              {submitting ? <><Loader2 className="animate-spin" size={18} />Updating...</> : <><Save size={18} />Update Configuration</>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
