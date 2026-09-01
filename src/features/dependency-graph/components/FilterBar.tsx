import { useQuery } from "@tanstack/react-query";
import apiClient, { Schemas } from "../../../shared/api/client";
import { Dropdown } from "../../../shared/ui/Dropdown";
import UniversalSearch, { SearchResultType } from "../../../app/components/UniversalSearch";
import { LabelFilterDropdown } from "../../../app/components/LabelFilterDropdown";
import { useCatalogAccess } from "../../../shared/catalog/CatalogAccessContext";

interface FilterBarProps {
  selectedEnv: string;
  setSelectedEnv: (env: string) => void;
  selectedDatacenter: string;
  setSelectedDatacenter: (dc: string) => void;
  selectedLabels?: string[];
  setSelectedLabels?: (labels: string[]) => void;
  query?: string;
  onQueryChange?: (query: string) => void;
  onSelectResult?: (id: string, type: SearchResultType) => void;
  showLabelPicker?: boolean;
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
  showLabelPicker = true,
}: FilterBarProps) {
  const { view, filters } = useCatalogAccess();
  // Fetch real datacenters from the API
  const { data: datacenterData = [] } = useQuery({
    queryKey: ["catalog", "graph-filter", "datacenters", view, filters.ownerUserId ?? "all-owners"],
    queryFn: async () => {
      const response = await apiClient.get<Schemas["CursorPageDtoOfDatacenterDto"]>("/api/v1/datacenters", {
        params: { view, limit: 100, ownerUserId: filters.ownerUserId || undefined },
        catalogRequest: true,
        catalogView: view,
      });
      return response.data.items ?? [];
    },
  });

  const datacenterOptions = [
    { value: "All", label: "All" },
    ...datacenterData.filter((dc): dc is typeof dc & { id: string; name: string } => Boolean(dc.id && dc.name)).map((dc) => ({
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
        {showLabelPicker && setSelectedLabels && (
          <LabelFilterDropdown
            selectedKeys={selectedLabels || []}
            onChange={setSelectedLabels}
          />
        )}
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
