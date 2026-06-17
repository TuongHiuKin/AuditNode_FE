import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { X, Loader2, Save, ChevronDown, MoveHorizontal, Check } from "lucide-react";
import { toast } from "sonner";
import apiClient, { Schemas } from "../../shared/api/client";

interface EditEntityDrawerProps {
  entityId: string | null;
  entityType: "SERVER" | "APP" | null;
  onClose: () => void;
  onApplicationsUpdated: () => void;
  onServersUpdated: () => void;
}

const PREDEFINED_ENV = ["Production", "Staging", "Development"];
const PREDEFINED_STATUS = ["Active", "Inactive", "Maintenance"];
const PREDEFINED_RISK = ["Low", "Medium", "High", "Critical"];

export function EditEntityDrawer({
  entityId,
  entityType,
  onClose,
  onApplicationsUpdated,
  onServersUpdated,
}: EditEntityDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [availableServers, setAvailableServers] = useState<Schemas["ServerResponseDto"][]>([]);
  const [portMappings, setPortMappings] = useState<any[]>([]);
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(null);
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const [serverSearchTerm, setServerSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, reset, setValue, watch } = useForm();

  const isOpen = !!entityId && !!entityType;

  // Watch values for dynamic dropdown logic
  const watchedEnv = watch("environment");
  const watchedStatus = watch("status");
  const watchedRisk = watch("risk");
  const watchedServerId = watch("serverId");

  // Click outside for custom dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsServerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync search term with selected value
  useEffect(() => {
    if (watchedServerId && !isServerDropdownOpen) {
      const srv = availableServers.find(s => s.id === watchedServerId);
      if (srv) {
        setServerSearchTerm(`${srv.hostname} (${srv.ipAddress})`);
      }
    }
  }, [watchedServerId, availableServers, isServerDropdownOpen]);

  const filteredServers = availableServers.filter(srv => {
    if (!serverSearchTerm) return true;
    const searchLower = serverSearchTerm.toLowerCase();
    const combined = `${srv.hostname} (${srv.ipAddress})`.toLowerCase();
    return (
      srv.hostname?.toLowerCase().includes(searchLower) || 
      srv.ipAddress?.toLowerCase().includes(searchLower) ||
      combined.includes(searchLower)
    );
  });

  const handleSelectServer = (srv: Schemas["ServerResponseDto"]) => {
    setValue("serverId", srv.id, { 
      shouldDirty: true, 
      shouldValidate: true 
    });
    setServerSearchTerm(`${srv.hostname} (${srv.ipAddress})`);
    setIsServerDropdownOpen(false);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFetchError(null);
      fetchData();
      if (entityType === "APP") {
        fetchAvailableServers();
      }
    } else {
      reset();
      setFetchError(null);
    }
  }, [entityId, entityType, isOpen]);

  const fetchAvailableServers = async () => {
    try {
      const response = await apiClient.get<Schemas["ServerResponseDto"][]>("/api/v1/servers");
      const rawResponse = response as any;
      const data = Array.isArray(rawResponse.data) ? rawResponse.data : (rawResponse.data?.data || []);
      setAvailableServers(data);
    } catch (error) {
      console.error("Failed to fetch available servers", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = entityType === "SERVER" 
        ? `/api/v1/servers/${entityId}` 
        : `/api/v1/applications/${entityId}`;
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
        
        // Populate deployments for selector (supports both 'servers' and 'portMappings' from API)
        const deployments = data.servers || data.portMappings || [];
        setPortMappings(deployments);

        // Pre-fill migration fields if available
        if (data.serverId) setValue("serverId", data.serverId);
        if (data.portNumber) setValue("portNumber", data.portNumber);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to fetch entity details";
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Hydration Logic: Auto-select mapping when drawer opens or mappings change
  useEffect(() => {
    if (entityType === "APP" && portMappings.length > 0) {
      const defaultMapping = portMappings[0];
      setSelectedMappingId(defaultMapping.id);
      // Ensure we use the correct ID property (serverId vs id)
      const targetServerId = defaultMapping.serverId || defaultMapping.id;
      
      // Force Hydration into react-hook-form
      setValue("serverId", targetServerId, { shouldValidate: true, shouldDirty: true });
      setValue("portNumber", defaultMapping.portNumber, { shouldValidate: true, shouldDirty: true });
    }
  }, [portMappings, entityType, setValue]);

  const handleSelectMapping = (mapping: any) => {
    setSelectedMappingId(mapping.id);
    const targetServerId = mapping.serverId || mapping.id;
    
    // Force Hydration into react-hook-form
    setValue("serverId", targetServerId, { shouldValidate: true, shouldDirty: true });
    setValue("portNumber", mapping.portNumber, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = async (formData: any) => {
    if (entityType === "APP") {
      if (!selectedMappingId && portMappings.length > 0) {
        toast.error("Please select a deployment to update");
        return;
      }
      if (!formData.serverId) {
        toast.error("Please select a Target Server");
        return;
      }
    }

    setSubmitting(true);
    try {
      const endpoint = entityType === "SERVER" 
        ? `/api/v1/servers/${entityId}` 
        : `/api/v1/applications/${entityId}`;
      
      // Aligned with Backend DTO properties
      const payload = entityType === "APP" 
        ? {
            // App Metadata
            appCode: formData.appCode,
            appName: formData.appName,
            ownerTeam: formData.ownerTeam,
            risk: formData.risk,
            
            // Network Mapping Payload - EXACT PROPERTY NAMES FOR BACKEND
            portMappingId: selectedMappingId, 
            serverId: formData.serverId,     // Target Infrastructure ID
            portNumber: Number(formData.portNumber), // Deployment Port
          }
        : formData;

      await apiClient.put(endpoint, payload);
      
      toast.success(`${entityType === "SERVER" ? "Server" : "Application"} updated successfully`);
      
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
                    <label htmlFor="ipAddress" className="block text-xs font-bold text-slate-400 uppercase mb-2">IP Address (Read-only)</label>
                    <input id="ipAddress" {...register("ipAddress")} disabled className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <label htmlFor="hostname" className="block text-xs font-bold text-white uppercase mb-2">Hostname</label>
                    <input id="hostname" {...register("hostname")} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="osType" className="block text-xs font-bold text-white uppercase mb-2">OS Type</label>
                      <input id="osType" {...register("osType")} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none transition-all" />
                    </div>
                    <div>
                      <label htmlFor="environment" className="block text-xs font-bold text-white uppercase mb-2">Environment</label>
                      <div className="relative">
                        <select id="environment" {...register("environment")} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 pr-10 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none appearance-none cursor-pointer">
                          {envOptions.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="status" className="block text-xs font-bold text-white uppercase mb-2">Status</label>
                    <div className="relative">
                      <select id="status" {...register("status")} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 pr-10 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none appearance-none cursor-pointer">
                        {statusOptions.map(opt => <option key={opt}>{opt}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="appCode" className="block text-xs font-bold text-slate-400 uppercase mb-2">App Code (Read-only)</label>
                    <input id="appCode" {...register("appCode")} disabled className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <label htmlFor="appName" className="block text-xs font-bold text-white uppercase mb-2">Application Name</label>
                    <input id="appName" {...register("appName")} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none transition-all" />
                  </div>
                  <div>
                    <label htmlFor="ownerTeam" className="block text-xs font-bold text-white uppercase mb-2">Owner Team</label>
                    <input id="ownerTeam" {...register("ownerTeam")} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none transition-all" />
                  </div>
                  <div>
                    <label htmlFor="risk" className="block text-xs font-bold text-white uppercase mb-2">Risk Level</label>
                    <div className="relative">
                      <select id="risk" {...register("risk")} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 pr-10 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none appearance-none cursor-pointer">
                        {riskOptions.map(opt => <option key={opt}>{opt}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Network Migration Section */}
                  <div className="pt-4 border-t border-slate-800">
                    <div className="flex items-center gap-2 mb-4">
                      <MoveHorizontal size={14} className="text-tertiary" />
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Network Mapping</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {portMappings && portMappings.length > 1 && (
                        <div className="mb-6 p-4 border border-slate-700 bg-slate-900/50 rounded-lg">
                          <label className="text-[10px] font-bold mb-3 block text-slate-400 uppercase tracking-widest">
                            Select Deployment to Modify
                          </label>
                          <div className="space-y-3">
                            {portMappings.map((dep: any) => (
                              <label key={dep.id} className="flex items-center space-x-3 text-sm text-slate-300 cursor-pointer hover:text-white group">
                                <input 
                                  type="radio" 
                                  name="deploymentSelector"
                                  value={dep.id}
                                  checked={selectedMappingId === dep.id}
                                  onChange={() => handleSelectMapping(dep)}
                                  className="w-4 h-4 text-tertiary bg-slate-800 border-slate-600 focus:ring-tertiary focus:ring-offset-slate-900"
                                />
                                <span className="flex flex-col">
                                  <span className={`font-medium ${selectedMappingId === dep.id ? 'text-white' : ''}`}>
                                    {dep.hostname || dep.serverName}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {dep.ipAddress} &mdash; Port: {dep.portNumber}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label htmlFor="serverIdSearch" className="block text-xs font-bold text-white uppercase mb-2 tracking-wide">Target Server</label>
                        <div className="relative" ref={dropdownRef}>
                          <input
                            id="serverIdSearch"
                            type="text"
                            role="combobox"
                            aria-expanded={isServerDropdownOpen}
                            value={serverSearchTerm}
                            onChange={(e) => {
                              setServerSearchTerm(e.target.value);
                              setIsServerDropdownOpen(true);
                            }}
                            onClick={() => {
                              setIsServerDropdownOpen(true);
                              setServerSearchTerm(""); // Clear search term to show full list on click
                            }}
                            placeholder="Select Target Infrastructure..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 pr-10 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none transition-all"
                            autoComplete="off"
                          />
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />

                          {isServerDropdownOpen && (
                            <ul className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 custom-scrollbar list-none m-0 p-0">
                              {filteredServers.length > 0 ? (
                                filteredServers.map((srv) => (
                                  <li
                                    key={srv.id}
                                    role="option"
                                    aria-selected={watchedServerId === srv.id}
                                    onClick={() => handleSelectServer(srv)}
                                    className={`p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 last:border-0 transition-colors flex items-center ${watchedServerId === srv.id ? 'bg-slate-700' : ''}`}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 shrink-0 ${watchedServerId === srv.id ? "opacity-100 text-tertiary" : "opacity-0"}`}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium text-sm text-white">{srv.hostname}</span>
                                      <span className="text-xs text-slate-400 font-mono">{srv.ipAddress}</span>
                                    </div>
                                  </li>
                                ))
                              ) : (
                                <li className="p-4 text-center text-sm text-slate-400">No infrastructure found.</li>
                              )}
                            </ul>
                          )}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="portNumber" className="block text-xs font-bold text-white uppercase mb-2 tracking-wide">Port Number</label>
                        <input 
                          id="portNumber"
                          type="number"
                          {...register("portNumber")}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-tertiary outline-none transition-all" 
                        />
                      </div>
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
