export type ExportFormat = "excel" | "csv";
export type ExportRow = Record<string, unknown>;

const FORMULA_PREFIX = /^[\s]*[=+\-@]/;

export function escapeSpreadsheetFormula(value: unknown): unknown {
  return typeof value === "string" && FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

export function sanitizeExportRows(data: readonly ExportRow[]): ExportRow[] {
  return data.map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, escapeSpreadsheetFormula(value)]),
  ));
}

async function writeWorkbook(data: readonly ExportRow[], filename: string, format: ExportFormat): Promise<void> {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(sanitizeExportRows(data));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Export");
  XLSX.writeFile(workbook, `${filename}.${format === "excel" ? "xlsx" : "csv"}`, format === "csv"
    ? { bookType: "csv" }
    : undefined);
}

export function exportToExcel(data: readonly ExportRow[], filename: string): Promise<void> {
  return writeWorkbook(data, filename, "excel");
}

export function exportToCSV(data: readonly ExportRow[], filename: string): Promise<void> {
  return writeWorkbook(data, filename, "csv");
}
