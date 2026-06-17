import * as XLSX from "xlsx";

/**
 * Common export options for SheetJS
 */
export type ExportFormat = "excel" | "csv";

/**
 * Generates and triggers download of an Excel (.xlsx) file
 * @param data Array of objects to export
 * @param filename Desired filename (without extension)
 */
export const exportToExcel = (data: any[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Audit Export");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Generates and triggers download of a CSV (.csv) file
 * Leveraging SheetJS for robust data escaping and formatting.
 * @param data Array of objects to export
 * @param filename Desired filename (without extension)
 */
export const exportToCSV = (data: any[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Audit Export");
  XLSX.writeFile(wb, `${filename}.csv`, { bookType: "csv" });
};
