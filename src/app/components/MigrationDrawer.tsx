import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { X, Loader2, Save, ChevronDown, MoveHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Schemas } from "../../shared/api/client";
import { ServerService } from "../../services/serverService";
import { ApplicationService } from "../../services/applicationService";
import type { ApplicationDeployment } from "../../shared/api/applicationTypes";

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
  const [deployments, setDeployments] = useState<ApplicationDeployment[]>([]);
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(null);
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
      setDeployments([]);
      setSelectedMappingId(null);
    }
  }, [applicationId, isOpen]);

  const fetchServers = async () => {
    setLoadingServers(true);
    try {
      setServers(await ServerService.getServers());
    } catch (error: unknown) {
      toast.error("Failed to fetch available servers");
    } finally {
      setLoadingServers(false);
    }
  };

  const fetchAppDetails = async () => {
    if (!applicationId) return;
    try {
      const data = await ApplicationService.getApplication(applicationId);
      setDeployments(data.servers || []);
      if (data.servers.length === 1) selectDeployment(data.servers[0]);
    } catch (error) {
      console.error("Error fetching app details for migration", error);
    }
  };

  const selectDeployment = (deployment: ApplicationDeployment) => {
    setSelectedMappingId(deployment.portMappingId);
    setValue("portNumber", deployment.portNumber);
    setValue("serverId", deployment.id);
  };

  const onSubmit = async (formData: MigrationForm) => {
    if (submitting) return;
    if (!selectedMappingId) {
      toast.error("Please select a deployment to migrate");
      return;
    }
    if (!formData.serverId) {
      toast.error("Please select a target server");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        portMappingId: selectedMappingId,
        serverId: formData.serverId,
        portNumber: Number(formData.portNumber),
      };

      await ApplicationService.migrateDeployment(payload);
      
      toast.success("Deployment updated successfully");
      
      // Full state invalidation across domain boundaries
      onApplicationsUpdated();
      onServersUpdated();
      
      // Keep drawer open for continuous updates/corrections per UX mandate
      // onClose(); 
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Update failed"));
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
        className={`relative w-[450px] h-screen bg-panel border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <MoveHorizontal size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground font-display">Edit Deployment</h2>
              <p className="text-xs text-muted-foreground mt-1 font-label">
                MODIFY SERVER BINDING AND PORT SETTINGS
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <form id="migration-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {deployments.length > 0 && (
                <fieldset className="space-y-2 rounded-lg border border-border bg-panel/50 p-4">
                  <legend className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-label">
                    Select deployment to migrate
                  </legend>
                  {deployments.map((deployment) => (
                    <label key={deployment.portMappingId} className="flex cursor-pointer items-center gap-3 text-sm text-foreground/80">
                      <input
                        type="radio"
                        name="migrationDeployment"
                        checked={selectedMappingId === deployment.portMappingId}
                        onChange={() => selectDeployment(deployment)}
                        className="h-4 w-4 border-border bg-surface text-primary focus:ring-primary"
                      />
                      <span>{deployment.hostname} ({deployment.ipAddress}) - Port {deployment.portNumber}</span>
                    </label>
                  ))}
                </fieldset>
              )}
              <div>
                <label className="block text-xs font-bold text-foreground uppercase mb-2 tracking-widest font-label">Target Server</label>
                <div className="relative">
                  <select 
                    {...register("serverId")}
                    disabled={loadingServers}
                    className="w-full bg-surface border border-border rounded-lg p-3 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Select a server...</option>
                    {servers.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.hostname} ({srv.ipAddress})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                {loadingServers && <p className="text-[10px] text-muted-foreground mt-1 animate-pulse font-label">Loading available infrastructure...</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground uppercase mb-2 tracking-widest font-label">Target Port Number</label>
                <input 
                  type="number"
                  {...register("portNumber")}
                  placeholder="e.g. 8080"
                  className="w-full bg-surface border border-border rounded-lg p-3 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none transition-all" 
                />
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/15 rounded-lg p-4">
              <p className="text-xs text-primary/80 leading-relaxed">
                <span className="font-bold">Note:</span> Updating the server binding or port will automatically reposition this application on the Topology Map and recalculate its connected network flows.
              </p>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-border bg-panel/50 shrink-0">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-lg border border-border text-sm font-bold text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-all">Cancel</button>
            <button 
              type="submit" 
              form="migration-form" 
              disabled={submitting || loadingServers} 
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_oklch(0.62_0.22_25/0.2)] disabled:opacity-50"
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

function getErrorMessage(error: unknown, fallback: string): string {
  if (!isRecord(error) || !isRecord(error.response) || !isRecord(error.response.data)) return fallback;
  return typeof error.response.data.message === "string" ? error.response.data.message : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
