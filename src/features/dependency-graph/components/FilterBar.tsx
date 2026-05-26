import { ToolbarDropdown } from "./ToolbarDropdown";

interface FilterBarProps {
  selectedEnv: string;
  setSelectedEnv: (env: string) => void;
  selectedDatacenter: string;
  setSelectedDatacenter: (dc: string) => void;
}

const envOptions = [
  { value: "All", label: "All" },
  { value: "Production", label: "Production" },
  { value: "Development", label: "Development" },
];

const datacenterOptions = [
  { value: "All", label: "All" },
  { value: "Corporate", label: "Corporate DC" },
  { value: "DMZ", label: "DMZ Zone" },
  { value: "AWS", label: "AWS Cloud" },
];

export function FilterBar({
  selectedEnv,
  setSelectedEnv,
  selectedDatacenter,
  setSelectedDatacenter,
}: FilterBarProps) {
  return (
    <div className="flex gap-2 items-center">
      <ToolbarDropdown
        label="Environment"
        value={selectedEnv}
        options={envOptions}
        onChange={setSelectedEnv}
      />
      <ToolbarDropdown
        label="Datacenter"
        value={selectedDatacenter}
        options={datacenterOptions}
        onChange={setSelectedDatacenter}
      />
    </div>
  );
}
