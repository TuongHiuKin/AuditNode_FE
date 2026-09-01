import type { ApplicationResponse } from "../api/applicationTypes";

export interface ExportLabel {
  key: string;
  value: string;
}

export interface ServerExportRecord {
  id: string;
  datacenterId?: string;
  ipAddress?: string;
  hostname?: string;
  osType?: string;
  environment?: string;
  status?: string;
  datacenterName?: string;
  datacenter?: string | { id?: string; name?: string } | null;
  labels?: ExportLabel[];
}

export type InventoryExportRow = Record<string, unknown> & { id: string };

export function buildRepeatedIdParams(ids: readonly string[]): URLSearchParams {
  const params = new URLSearchParams();
  ids.forEach((id) => params.append("ids", id));
  return params;
}

export function unwrapExportList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (isRecord(payload) && Array.isArray(payload.data)) return payload.data as T[];
  return [];
}

export function mapServerExportRows(records: readonly ServerExportRecord[]): InventoryExportRow[] {
  return records.map((server) => ({
    id: server.id,
    ipAddress: server.ipAddress ?? "N/A",
    hostname: server.hostname ?? "N/A",
    osType: server.osType ?? "N/A",
    environment: server.environment ?? "N/A",
    status: server.status ?? "N/A",
    datacenterName: datacenterName(server),
    labels: labelsText(server.labels),
  }));
}

export function mapApplicationExportRows(records: readonly ApplicationResponse[]): InventoryExportRow[] {
  return records.flatMap<InventoryExportRow>((application) => {
    const common = {
      id: application.id,
      appCode: application.appCode,
      appName: application.appName,
      ownerTeam: application.ownerTeam,
      risk: application.risk,
      techStack: application.techStack,
      labels: labelsText(application.labels),
    };
    if (application.servers.length === 0) {
      return [{ ...common, portMappingId: "N/A", portNumber: "N/A", protocol: "N/A", serverName: "N/A" }];
    }
    return application.servers.map((deployment) => ({
      ...common,
      portMappingId: deployment.portMappingId,
      portNumber: deployment.portNumber,
      protocol: deployment.protocol,
      serverName: deployment.hostname,
    }));
  });
}

export function selectExportColumns(
  rows: readonly InventoryExportRow[],
  columns: readonly { key: string; label: string }[],
  selectedColumns: readonly string[],
): Record<string, unknown>[] {
  return rows.map((item) => Object.fromEntries(columns
    .filter((column) => selectedColumns.includes(column.key))
    .map((column) => [column.label, item[column.key] ?? "N/A"])));
}

function datacenterName(server: ServerExportRecord): string {
  if (server.datacenterName) return server.datacenterName;
  if (typeof server.datacenter === "string") return server.datacenter;
  return server.datacenter?.name ?? server.datacenterId ?? "N/A";
}

function labelsText(labels: readonly ExportLabel[] | undefined): string {
  return labels?.map((label) => `${label.key}=${label.value}`).join("; ") || "N/A";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
