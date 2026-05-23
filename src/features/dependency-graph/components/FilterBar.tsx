interface FilterBarProps {
  selectedEnv: string;
  setSelectedEnv: (env: string) => void;
  selectedDatacenter: string;
  setSelectedDatacenter: (dc: string) => void;
}

const selectCls = "bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-tertiary transition-colors font-body";

export function FilterBar({
  selectedEnv,
  setSelectedEnv,
  selectedDatacenter,
  setSelectedDatacenter,
}: FilterBarProps) {
  return (
    <div className="flex gap-4 items-center">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-label text-secondary uppercase tracking-widest">Environment</span>
        <select
          value={selectedEnv}
          onChange={(e) => setSelectedEnv(e.target.value)}
          className={selectCls}
        >
          <option value="All">All Environments</option>
          <option value="Production">Production</option>
          <option value="Development">Development</option>
        </select>
      </div>

      <div className="w-px h-6 bg-border" />

      <div className="flex items-center gap-3">
        <span className="text-[10px] font-label text-secondary uppercase tracking-widest">Datacenter</span>
        <select
          value={selectedDatacenter}
          onChange={(e) => setSelectedDatacenter(e.target.value)}
          className={selectCls}
        >
          <option value="All">All Datacenters</option>
          <option value="Corporate">Corporate DC</option>
          <option value="DMZ">DMZ Zone</option>
          <option value="AWS">AWS Cloud</option>
        </select>
      </div>
    </div>
  );
}
