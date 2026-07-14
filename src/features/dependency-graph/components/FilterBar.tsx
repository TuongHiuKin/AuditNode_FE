import { useQuery } from "@tanstack/react-query";
import apiClient, { Schemas } from "../../../shared/api/client";
import { Dropdown } from "../../../shared/ui/Dropdown";
import UniversalSearch, { SearchResultType } from "../../../app/components/UniversalSearch";

interface FilterBarProps {
  selectedEnv: string;
  setSelectedEnv: (env: string) => void;
  selectedDatacenter: string;
  setSelectedDatacenter: (dc: string) => void;
  selectedLabels: string[];
  setSelectedLabels: (labels: string[]) => void;
  query?: string;
  onQueryChange?: (query: string) => void;
  onSelectResult?: (id: string, type: SearchResultType) => void;
}

const envOptions = [
  { value: "All", label: "All" },
  { value: "Production", label: "Production" },
  { value: "Development", label: "Development" },
];

export function FilterBar({
  selectedEnv,
  setSelectedEnv,
  selectedDatacenter,
  setSelectedDatacenter,
  selectedLabels = [],
  setSelectedLabels,
  query = "",
  onQueryChange,
  onSelectResult,
}: FilterBarProps) {
  // Fetch real datacenters from the API
  const { data: datacenterData = [] } = useQuery({
    queryKey: ["datacenters"],
    queryFn: async () => {
      const response = await apiClient.get<Schemas["Datacenter"][]>("/api/v1/datacenters");
      const rawResponse = response as any;
      return Array.isArray(rawResponse.data) ? rawResponse.data : (rawResponse.data?.data || []);
    },
  });

  const datacenterOptions = [
    { value: "All", label: "All" },
    ...datacenterData.map((dc: any) => ({
      value: dc.id,
      label: dc.name,
    })),
  ];

  return (
    <div className="flex gap-4 items-center">
      <div className="flex gap-2 items-center">
        <Dropdown
          label="Environment"
          value={selectedEnv}
          options={envOptions}
          onChange={setSelectedEnv}
        />
        <Dropdown
          label="Datacenter"
          value={selectedDatacenter}
          options={datacenterOptions}
          onChange={setSelectedDatacenter}
        />
        <div className="flex flex-col ml-2">
          <input
            type="text"
            placeholder="Labels (comma separated)"
            className="h-[34px] bg-background border border-border rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={selectedLabels.join(', ')}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedLabels(val ? val.split(',').map(s => s.trim()).filter(Boolean) : []);
            }}
          />
        </div>
      </div>

      <div className="h-5 w-px bg-border mx-1" />

      {/* Search Bar - matches Inventory page style */}
      {(onQueryChange || onSelectResult) && (
        <div className="w-64">
          <UniversalSearch
            value={query}
            onChange={onQueryChange ?? (() => {})}
            onSelectResult={onSelectResult ?? (() => {})}
            placeholder="Search servers & apps..."
            inputClassName="py-1.5 h-[34px]"
          />
        </div>
      )}
    </div>
  );
}
