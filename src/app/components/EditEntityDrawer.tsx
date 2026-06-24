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
  const [labels, setLabels] = useState<{ key: string; value: string }[]>([]);
  const [labelInput, setLabelInput] = useState({ key: '', value: '' });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, reset, setValue, watch } = useForm();

  const handleAddLabel = () => {
    if (!labelInput.key.trim() || !labelInput.value.trim()) return;
    setLabels(prev => [...prev, { key: labelInput.key.trim(), value: labelInput.value.trim() }]);
    setLabelInput({ key: "", value: "" });
  };

  const handleRemoveLabel = (index: number) => {
    setLabels(prev => prev.filter((_, i) => i !== index));
  };

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
      setLabels([]);
      setLabelInput({ key: '', value: '' });
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
      
      setLabels(data.labels || []);
      
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
            labels,
            
            // Network Mapping Payload - EXACT PROPERTY NAMES FOR BACKEND
            portMappingId: selectedMappingId, 
            serverId: formData.serverId,     // Target Infrastructure ID
            portNumber: Number(formData.portNumber), // Deployment Port
          }
        : {
            ...formData,
            // Ensure values not explicitly registered but set via setValue are included
            datacenterId: watch("datacenterId"),
            labels,
          };

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
        className={`relative w-[450px] h-screen bg-panel border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <div>
            <h2 className="text-xl font-bold text-foreground font-display">Edit Resource</h2>
            <p className="text-xs text-muted-foreground mt-1 font-label">
              {entityType} ID: {entityId?.substring(0, 8)}...
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Loader2 className="animate-spin text-primary" size={32} />
              <p className="text-sm font-medium">Synchronizing resource data...</p>
            </div>
          ) : fetchError ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-4">
              <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center text-danger">
                <X size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1 font-display">Fetch Failed</h3>
                <p className="text-sm text-muted-foreground">{fetchError}</p>
              </div>
              <button onClick={fetchData} className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-sm font-medium text-foreground transition-colors">Retry Connection</button>
            </div>
          ) : (
            <form id="edit-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {entityType === "SERVER" ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="ipAddress" className="block text-xs font-bold text-muted-foreground uppercase mb-2 font-label">IP Address (Read-only)</label>
                    <input id="ipAddress" {...register("ipAddress", { disabled: true })} className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-muted-foreground cursor-not-allowed" />
                  </div>
                  <div>
                    <label htmlFor="hostname" className="block text-xs font-bold text-foreground uppercase mb-2 font-label">Hostname</label>
                    <input id="hostname" {...register("hostname")} className="w-full bg-surface border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="osType" className="block text-xs font-bold text-foreground uppercase mb-2 font-label">OS Type</label>
                      <input id="osType" {...register("osType")} className="w-full bg-surface border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all" />
                    </div>
                    <div>
                      <label htmlFor="environment" className="block text-xs font-bold text-foreground uppercase mb-2 font-label">Environment</label>
                      <div className="relative">
                        <select id="environment" {...register("environment")} className="w-full bg-surface border border-border rounded-lg p-2.5 pr-10 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer">
                          {envOptions.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="status" className="block text-xs font-bold text-foreground uppercase mb-2 font-label">Status</label>
                    <div className="relative">
                      <select id="status" {...register("status")} className="w-full bg-surface border border-border rounded-lg p-2.5 pr-10 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer">
                        {statusOptions.map(opt => <option key={opt}>{opt}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="appCode" className="block text-xs font-bold text-muted-foreground uppercase mb-2 font-label">App Code (Read-only)</label>
                    <input id="appCode" {...register("appCode", { disabled: true })} className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-muted-foreground cursor-not-allowed" />
                  </div>
                  <div>
                    <label htmlFor="appName" className="block text-xs font-bold text-foreground uppercase mb-2 font-label">Application Name</label>
                    <input id="appName" {...register("appName")} className="w-full bg-surface border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div>
                    <label htmlFor="ownerTeam" className="block text-xs font-bold text-foreground uppercase mb-2 font-label">Owner Team</label>
                    <input id="ownerTeam" {...register("ownerTeam")} className="w-full bg-surface border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div>
                    <label htmlFor="risk" className="block text-xs font-bold text-foreground uppercase mb-2 font-label">Risk Level</label>
                    <div className="relative">
                      <select id="risk" {...register("risk")} className="w-full bg-surface border border-border rounded-lg p-2.5 pr-10 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer">
                        {riskOptions.map(opt => <option key={opt}>{opt}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  {/* Network Migration Section */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-4">
                      <MoveHorizontal size={14} className="text-primary" />
                      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-label">Network Mapping</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {portMappings && portMappings.length > 1 && (
                        <div className="mb-6 p-4 border border-border bg-panel/50 rounded-lg">
                          <label className="text-[10px] font-bold mb-3 block text-muted-foreground uppercase tracking-widest font-label">
                            Select Deployment to Modify
                          </label>
                          <div className="space-y-3">
                            {portMappings.map((dep: any) => (
                              <label key={dep.id} className="flex items-center space-x-3 text-sm text-foreground/80 cursor-pointer hover:text-foreground group">
                                <input 
                                  type="radio" 
                                  name="deploymentSelector"
                                  value={dep.id}
                                  checked={selectedMappingId === dep.id}
                                  onChange={() => handleSelectMapping(dep)}
                                  className="w-4 h-4 text-primary bg-surface border-border focus:ring-primary focus:ring-offset-panel"
                                />
                                <span className="flex flex-col">
                                  <span className={`font-medium ${selectedMappingId === dep.id ? 'text-foreground' : ''}`}>
                                    {dep.hostname || dep.serverName}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-label">
                                    {dep.ipAddress} &mdash; Port: {dep.portNumber}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label htmlFor="serverIdSearch" className="block text-xs font-bold text-foreground uppercase mb-2 tracking-wide font-label">Target Server</label>
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
                            className="w-full bg-surface border border-border rounded-lg p-2.5 pr-10 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all"
                            autoComplete="off"
                          />
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />

                          {isServerDropdownOpen && (
                            <ul className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-surface border border-border rounded-lg shadow-xl z-50 custom-scrollbar list-none m-0 p-0">
                              {filteredServers.length > 0 ? (
                                filteredServers.map((srv) => (
                                  <li
                                    key={srv.id}
                                    role="option"
                                    aria-selected={watchedServerId === srv.id}
                                    onClick={() => handleSelectServer(srv)}
                                    className={`p-3 hover:bg-surface-hover cursor-pointer border-b border-border/50 last:border-0 transition-colors flex items-center ${watchedServerId === srv.id ? 'bg-surface-hover' : ''}`}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 shrink-0 ${watchedServerId === srv.id ? "opacity-100 text-primary" : "opacity-0"}`}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium text-sm text-foreground">{srv.hostname}</span>
                                      <span className="text-xs text-muted-foreground font-label">{srv.ipAddress}</span>
                                    </div>
                                  </li>
                                ))
                              ) : (
                                <li className="p-4 text-center text-sm text-muted-foreground">No infrastructure found.</li>
                              )}
                            </ul>
                          )}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="portNumber" className="block text-xs font-bold text-foreground uppercase mb-2 tracking-wide font-label">Port Number</label>
                        <input 
                          id="portNumber"
                          type="number"
                          {...register("portNumber")}
                          className="w-full bg-surface border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Labels / Tags Section */}
              <div className="flex flex-col gap-2 pt-4 border-t border-border mt-4">
                <label className="text-xs font-bold text-foreground uppercase tracking-widest font-mono">Labels / Tags</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Key (e.g. Env)"
                    className="flex-1 bg-surface border border-border text-foreground text-xs font-mono rounded-md p-2.5 outline-none focus:border-primary"
                    value={labelInput.key}
                    onChange={(e) => setLabelInput({ ...labelInput, key: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. Prod)"
                    className="flex-1 bg-surface border border-border text-foreground text-xs font-mono rounded-md p-2.5 outline-none focus:border-primary"
                    value={labelInput.value}
                    onChange={(e) => setLabelInput({ ...labelInput, value: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddLabel();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddLabel}
                    className="bg-panel border border-border hover:bg-surface-hover text-foreground text-xs font-bold uppercase px-4 py-2.5 rounded-md transition-colors"
                  >
                    Add
                  </button>
                </div>
                {labels.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {labels.map((lbl, idx) => (
                      <div key={idx} className="flex items-center bg-surface border border-border rounded-md px-2.5 py-1.5 gap-2">
                        <span className="font-mono text-xs text-foreground uppercase">
                          <span className="text-muted-foreground">{lbl.key}:</span> {lbl.value}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLabel(idx)}
                          className="text-muted-foreground hover:text-foreground outline-none"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        <div className="p-6 border-t border-border bg-panel/50 shrink-0">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-bold text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-all">Cancel</button>
            <button type="submit" form="edit-form" disabled={submitting || loading} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_oklch(0.62_0.22_25/0.2)] disabled:opacity-50">
              {submitting ? <><Loader2 className="animate-spin" size={18} />Updating...</> : <><Save size={18} />Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
