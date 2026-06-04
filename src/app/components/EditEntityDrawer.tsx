import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { X, Loader2, Save, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import apiClient from "../../shared/api/client";

interface EditEntityDrawerProps {
  entityId: string | null;
  entityType: "SERVER" | "APP" | null;
  onClose: () => void;
  onUpdateSuccess: () => void;
}

const PREDEFINED_ENV = ["Production", "Staging", "Development"];
const PREDEFINED_STATUS = ["Active", "Inactive", "Maintenance"];
const PREDEFINED_RISK = ["Low", "Medium", "High", "Critical"];

export function EditEntityDrawer({
  entityId,
  entityType,
  onClose,
  onUpdateSuccess,
}: EditEntityDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, setValue, watch } = useForm();

  const isOpen = !!entityId && !!entityType;

  // Watch values for dynamic dropdown logic
  const watchedEnv = watch("environment");
  const watchedStatus = watch("status");
  const watchedRisk = watch("risk");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFetchError(null);
      fetchData();
    } else {
      reset();
      setFetchError(null);
    }
  }, [entityId, entityType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = entityType === "SERVER" 
        ? `/api/Servers/${entityId}` 
        : `/api/Applications/${entityId}`;
      const response = await apiClient.get(endpoint);
      const rawResponse = response as any;
      const data = rawResponse.data?.data ?? rawResponse.data;
      
      if (entityType === "SERVER") {
        setValue("hostname", data.hostname);
        setValue("ipAddress", data.ipAddress);
        setValue("osType", data.osType);
        setValue("environment", data.environment);
        setValue("status", data.status);
        setValue("datacenterId", data.datacenterId);
      } else {
        setValue("appName", data.appName);
        setValue("appCode", data.appCode);
        setValue("ownerId", data.ownerId);
        setValue("ownerTeam", data.ownerTeam || "");
        setValue("risk", data.risk);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to fetch entity details";
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (formData: any) => {
    setSubmitting(true);
    try {
      const endpoint = entityType === "SERVER" 
        ? `/api/Servers/${entityId}` 
        : `/api/Applications/${entityId}`;
      
      // Filter out redundant fields for APP update to match architectural mandate
      const payload = entityType === "APP" 
        ? {
            appName: formData.appName,
            ownerTeam: formData.ownerTeam,
            risk: formData.risk,
            // appCode and ownerId are usually read-only or not part of this specific metadata update
          }
        : formData;

      await apiClient.put(endpoint, payload);
      
      toast.success(`${entityType === "SERVER" ? "Server" : "Application"} updated successfully`);
      onUpdateSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Dynamic fallback logic for dropdowns
  const envOptions = useMemo(() => 
    !watchedEnv || PREDEFINED_ENV.includes(watchedEnv) ? PREDEFINED_ENV : [...PREDEFINED_ENV, watchedEnv]
  , [watchedEnv]);

  const statusOptions = useMemo(() => 
    !watchedStatus || PREDEFINED_STATUS.includes(watchedStatus) ? PREDEFINED_STATUS : [...PREDEFINED_STATUS, watchedStatus]
  , [watchedStatus]);

  const riskOptions = useMemo(() => 
    !watchedRisk || PREDEFINED_RISK.includes(watchedRisk) ? PREDEFINED_RISK : [...PREDEFINED_RISK, watchedRisk]
  , [watchedRisk]);

  if (!mounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex justify-end ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose} 
      />

      <div 
        className={`relative w-[450px] h-screen bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Edit Resource</h2>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">
              {entityType} ID: {entityId?.substring(0, 8)}...
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="animate-spin text-tertiary" size={32} />
              <p className="text-sm font-medium">Synchronizing resource data...</p>
            </div>
          ) : fetchError ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-4">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500">
                <X size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Fetch Failed</h3>
                <p className="text-sm text-slate-400">{fetchError}</p>
              </div>
              <button onClick={fetchData} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium text-white transition-colors">Retry Connection</button>
            </div>
          ) : (
            <form id="edit-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {entityType === "SERVER" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">IP Address (Read-only)</label>
                    <input {...register("ipAddress")} disabled className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white uppercase mb-2">Hostname</label>
                    <input {...register("hostname")} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-white uppercase mb-2">OS Type</label>
                      <input {...register("osType")} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white uppercase mb-2">Environment</label>
                      <div className="relative">
                        <select {...register("environment")} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 pr-10 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none appearance-none cursor-pointer">
                          {envOptions.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white uppercase mb-2">Status</label>
                    <div className="relative">
                      <select {...register("status")} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 pr-10 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none appearance-none cursor-pointer">
                        {statusOptions.map(opt => <option key={opt}>{opt}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">App Code (Read-only)</label>
                    <input {...register("appCode")} disabled className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white uppercase mb-2">Application Name</label>
                    <input {...register("appName")} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white uppercase mb-2">Owner Team</label>
                    <input {...register("ownerTeam")} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white uppercase mb-2">Risk Level</label>
                    <div className="relative">
                      <select {...register("risk")} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 pr-10 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none appearance-none cursor-pointer">
                        {riskOptions.map(opt => <option key={opt}>{opt}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-700 text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-all">Cancel</button>
            <button type="submit" form="edit-form" disabled={submitting || loading} className="flex-1 bg-tertiary hover:bg-tertiary/90 text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,77,126,0.2)] disabled:opacity-50">
              {submitting ? <><Loader2 className="animate-spin" size={18} />Updating...</> : <><Save size={18} />Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
