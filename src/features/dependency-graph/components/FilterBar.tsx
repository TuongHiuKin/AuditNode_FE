interface FilterBarProps {
  selectedEnv: string;
  setSelectedEnv: (env: string) => void;
  selectedDatacenter: string;
  setSelectedDatacenter: (dc: string) => void;
}

const selectCls = "bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-tertiary transition-colors font-body";

export function FilterBar({
  selectedEnv,
  setSelectedEnv,
  selectedDatacenter,
  setSelectedDatacenter,
}: FilterBarProps) {
  return (
    <div className="flex gap-4 items-center bg-[#020617]/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-[#1e293b] shadow-2xl">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-label text-tertiary uppercase tracking-widest">Environment</span>
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

      <div className="w-px h-6 bg-[#1e293b]" />

      <div className="flex items-center gap-3">
        <span className="text-[10px] font-label text-tertiary uppercase tracking-widest">Datacenter</span>
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
