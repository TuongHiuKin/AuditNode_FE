import { useQuery } from "@tanstack/react-query";
import apiClient, { Schemas } from "../../../shared/api/client";
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

export function FilterBar({
  selectedEnv,
  setSelectedEnv,
  selectedDatacenter,
  setSelectedDatacenter,
}: FilterBarProps) {
  // Fetch real datacenters from the API
  const { data: datacenterData = [] } = useQuery({
    queryKey: ["datacenters"],
    queryFn: async () => {
      const response = await apiClient.get<Schemas["DatacenterResponseDto"][]>("/api/Datacenters");
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
