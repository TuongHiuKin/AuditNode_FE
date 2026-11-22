import { describe, expect, it } from "vitest";
import {
  buildRepeatedIdParams,
  mapApplicationExportRows,
  mapServerExportRows,
} from "../shared/utils/inventoryExport";

describe("inventory export contract", () => {
  it("serializes IDs as repeated query parameters", () => {
    expect(buildRepeatedIdParams(["id-1", "id-2"]).toString()).toBe("ids=id-1&ids=id-2");
  });

  it("maps actual datacenter and labels for server export", () => {
    expect(mapServerExportRows([{
      id: "server-1",
      hostname: "api-01",
      datacenter: { id: "dc-1", name: "SG-1" },
      labels: [{ key: "tier", value: "api" }],
    }])).toEqual([expect.objectContaining({
      id: "server-1",
      datacenterName: "SG-1",
      labels: "tier=api",
    })]);
  });

  it("flattens application deployments with exact mapping identity and labels", () => {
    expect(mapApplicationExportRows([{
      id: "app-1",
      appCode: "PAY",
      appName: "Payments",
      ownerTeam: "Platform",
      risk: "High",
      icon: "",
      techStack: "dotnet",
      labels: [{ key: "domain", value: "finance" }],
      servers: [
        { id: "server-1", hostname: "api-01", ipAddress: "10.0.0.1", portMappingId: "mapping-1", portNumber: 8443, protocol: "HTTPS" },
        { id: "server-2", hostname: "api-02", ipAddress: "10.0.0.2", portMappingId: "mapping-2", portNumber: 9443, protocol: "HTTPS" },
      ],
    }])).toEqual([
      expect.objectContaining({ portMappingId: "mapping-1", portNumber: 8443, protocol: "HTTPS", labels: "domain=finance" }),
      expect.objectContaining({ portMappingId: "mapping-2", portNumber: 9443, protocol: "HTTPS", labels: "domain=finance" }),
    ]);
  });
});
