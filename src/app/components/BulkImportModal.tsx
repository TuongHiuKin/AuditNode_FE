import { X, Download, Upload, AlertCircle, CheckCircle, AlertTriangle, ChevronRight, Save, Trash2 } from "lucide-react";
import { useState, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import apiClient from "../../shared/api/client";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";
import { API_ENDPOINTS } from "../../config/endpoints";
import {
  getErrorMessage,
  getImportProblemIssues,
  type ImportProblemIssue,
} from "../../shared/utils/errorUtils";

/**
 * CORE DATA STRUCTURES
 */
type ImportRow = {
  _id: string;
  status: "valid" | "error";
  errors: Record<string, string>;
  data: CanonicalImportData;
};

export const INVENTORY_IMPORT_HEADERS = [
  "Server Name",
  "IP",
  "Environment",
  "App Code",
  "App Name",
  "Owner Team",
  "Port",
  "Protocol",
] as const;

type CanonicalImportData = {
  serverName: string;
  ipAddress: string;
  environment: string;
  appCode: string;
  appName: string;
  ownerTeam: string;
  port: string;
  protocol: string;
};

type CanonicalWorkbookRow = Record<(typeof INVENTORY_IMPORT_HEADERS)[number], string>;

export interface BulkImportModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * MOCK VALIDATION ENGINE
 * In a real app, this would match your backend schema
 */
const validateRow = (data: CanonicalImportData): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  // 1. Required String Fields
  if (!data.serverName || String(data.serverName).trim() === "") {
    errors.serverName = "Server Name is required";
  }
  
  if (!data.appCode || String(data.appCode).trim() === "") {
    errors.appCode = "App Code is required";
  }

  if (!data.appName || String(data.appName).trim() === "") {
    errors.appName = "Application Name is required";
  }

  if (!data.environment.trim()) {
    errors.environment = "Environment is required";
  }

  if (!data.ownerTeam.trim()) {
    errors.ownerTeam = "Owner Team is required";
  }

  if (!data.protocol.trim()) {
    errors.protocol = "Protocol is required";
  }
  
  // 2. IP Address Validation (Strict IPv4)
  if (!data.ipAddress || String(data.ipAddress).trim() === "") {
    errors.ipAddress = "IP Address is required";
  } else {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(String(data.ipAddress))) {
      errors.ipAddress = "Invalid IPv4 format";
    }
  }
  
  // 3. Port Validation
  if (!data.port || String(data.port).trim() === "") {
    errors.port = "Port is required";
  } else {
    const portNum = Number(data.port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      errors.port = "Valid Port (1-65535) is required";
    }
  }

  return errors;
};

function parseWorkbookRow(row: Record<string, unknown>): CanonicalImportData {
  return {
    serverName: cellText(row["Server Name"]),
    ipAddress: cellText(row.IP),
    environment: cellText(row.Environment),
    appCode: cellText(row["App Code"]),
    appName: cellText(row["App Name"]),
    ownerTeam: cellText(row["Owner Team"]),
    port: cellText(row.Port),
    protocol: cellText(row.Protocol),
  };
}

function toWorkbookRow(data: CanonicalImportData): CanonicalWorkbookRow {
  return {
    "Server Name": data.serverName,
    IP: data.ipAddress,
    Environment: data.environment,
    "App Code": data.appCode,
    "App Name": data.appName,
    "Owner Team": data.ownerTeam,
    Port: data.port,
    Protocol: data.protocol,
  };
}

function cellText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

export function BulkImportModal({ onClose, onSuccess }: BulkImportModalProps) {
  // State Management
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [view, setView] = useState<"upload" | "review">("upload");
  const [filterTab, setFilterTab] = useState<"all" | "valid" | "error">("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importIssues, setImportIssues] = useState<ImportProblemIssue[]>([]);
  
  const isFilePickerOpen = useRef(false);

  const handleSafeClose = () => {
    if (isFilePickerOpen.current) return;
    onClose();
  };

  // Computed Stats
  const stats = useMemo(() => {
    const total = rows.length;
    const valid = rows.filter((r) => r.status === "valid").length;
    const error = total - valid;
    return { total, valid, error };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (filterTab === "all") return rows;
    return rows.filter((r) => r.status === filterTab);
  }, [rows, filterTab]);

  /**
   * PHASE 1: INGESTION & TRIAGE
   */
  const handleFileDrop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setImportIssues([]);
    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: "binary" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

          const normalizedRows: ImportRow[] = rawData.map((row) => {
            const mappedData = parseWorkbookRow(row);

            const errors = validateRow(mappedData);
            return {
              _id: crypto.randomUUID(),
              status: Object.keys(errors).length === 0 ? "valid" : "error",
              errors,
              data: mappedData,
            };
          });
          
          setRows(normalizedRows);
        } catch (err: unknown) {
          console.error("[Parse Error]", err);
          toast.error("Failed to parse the Excel file.");
        } finally {
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read the file.");
        setIsProcessing(false);
      };
      reader.readAsBinaryString(selectedFile);
    } catch (err: unknown) {
      console.error("[File Read Error]", err);
      toast.error(getErrorMessage(err, "Failed to process the file."));
      setIsProcessing(false);
    } finally {
      e.target.value = "";
    }
  };

  /**
   * PHASE 2: INLINE EDITING LOGIC
   */
  const handleCellChange = (rowId: string, field: keyof CanonicalImportData, value: string) => {
    setImportIssues([]);
    setRows((prev) =>
      prev.map((row) => {
        if (row._id !== rowId) return row;

        const updatedData = { ...row.data, [field]: value };
        const errors = validateRow(updatedData);
        
        return {
          ...row,
          data: updatedData,
          errors,
          status: Object.keys(errors).length === 0 ? "valid" : "error",
        };
      })
    );
  };

  const removeRow = (rowId: string) => {
    setRows(prev => prev.filter(r => r._id !== rowId));
  };

  /**
   * PHASE 3: PARTIAL COMMIT ENGINE
   */
  const handlePartialImport = async () => {
    const validRows = rows.filter((r) => r.status === "valid");
    if (validRows.length === 0) return;

    setIsImporting(true);
    
    try {
      // 1. Re-create Excel structure from validRows
      const exportData = validRows.map((row) => toWorkbookRow(row.data));

      // 2. Build workbook
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory");

      // 3. Write to binary and create Blob
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const newFileBlob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      // 4. Submit through the standard API client so the in-memory token is applied.
      const formData = new FormData();
      formData.append("file", newFileBlob, "partial_import.xlsx");
      
      await apiClient.post(API_ENDPOINTS.INVENTORY.IMPORT, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      toast.success(`Successfully imported ${validRows.length} rows`);
      setImportIssues([]);
      
      // CRITICAL SUCCESS LOGIC: Remove only successfully imported rows
      const validIds = new Set(validRows.map(r => r._id));
      const remainingRows = rows.filter(r => !validIds.has(r._id));
      
      setRows(remainingRows);
      
      if (remainingRows.length === 0) {
        onSuccess?.();
        onClose();
      } else {
        setFilterTab("error"); // Focus on what's left to fix
      }
    } catch (err: unknown) {
      console.error("[Upload Error]", err);
      const issues = getImportProblemIssues(err);
      if (issues.length > 0) {
        const issueMessagesByRowId = new Map<string, string[]>();
        issues.forEach((issue) => {
          if (issue.row === undefined) return;
          const submittedRow = validRows[issue.row - 2];
          if (!submittedRow) return;
          const messages = issueMessagesByRowId.get(submittedRow._id) ?? [];
          messages.push(issue.message);
          issueMessagesByRowId.set(submittedRow._id, messages);
        });
        setRows((currentRows) => currentRows.map((row) => {
          const messages = issueMessagesByRowId.get(row._id);
          return messages
            ? {
                ...row,
                status: "error",
                errors: { ...row.errors, backend: messages.join(" ") },
              }
            : row;
        }));
        setImportIssues(issues);
        setView("review");
        setFilterTab("error");
      }
      toast.error(getErrorMessage(err, "Bulk import failed"));
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await apiClient.get("/api/v1/inventory/import-template", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Inventory_Import_Template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error("Failed to download template");
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50 p-4 backdrop-blur-sm" onClick={handleSafeClose}>
      <div
        className="bg-panel border border-border rounded-2xl shadow-2xl w-full max-w-6xl min-w-[600px] flex flex-col overflow-hidden max-h-[95vh]"
        style={{ animation: "exportModalIn 0.2s ease-out both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-surface/50">
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2 font-display">
              Iterative Bulk Import
              {rows.length > 0 && (
                <Badge variant="outline" className="border-border text-muted-foreground font-normal">
                  {stats.total} Total Rows
                </Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Parse, fix errors inline, and selectively import valid records.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-surface-hover rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {view === "upload" && rows.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center gap-8">
              {/* Icon + heading */}
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary ring-1 ring-primary/20">
                  <Upload size={32} />
                </div>
                <div className="space-y-2 w-80 text-center">
                  <h4 className="text-2xl font-bold text-foreground font-display">Import Your Inventory</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Drop your Excel file here. Our system will automatically detect errors and let you fix them before committing to the database.
                  </p>
                  <p className="text-[11px] text-muted-foreground font-label">
                    Required headers: {INVENTORY_IMPORT_HEADERS.join(", ")}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2 border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground">
                  <Download size={16} />
                  Download Template
                </Button>

                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onClick={(e) => {
                      e.stopPropagation();
                      isFilePickerOpen.current = true;
                      
                      // Lắng nghe sự kiện window focus để biết khi nào OS File Picker thực sự đóng
                      const handleFocus = () => {
                        // Thêm timeout để đảm bảo mọi event click/blur của OS đã hoàn tất
                        setTimeout(() => {
                          isFilePickerOpen.current = false;
                        }, 500);
                        window.removeEventListener("focus", handleFocus);
                      };
                      window.addEventListener("focus", handleFocus);
                    }}
                    onChange={handleFileDrop}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    disabled={isProcessing}
                  />
                  <Button disabled={isProcessing} className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                    {isProcessing ? "Processing..." : "Select Excel File"}
                    {!isProcessing && <ChevronRight size={16} />}
                  </Button>
                </div>
              </div>

              {/* Feature hints */}
              <div className="pt-6 border-t border-border w-full max-w-lg">
                <div className="flex justify-center gap-8 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-success" /> Automatic Validation</span>
                  <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-success" /> Inline Fixing</span>
                  <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-success" /> Partial Imports</span>
                </div>
              </div>
            </div>
          ) : view === "upload" && rows.length > 0 ? (
            <div className="p-10 h-full flex flex-col justify-center gap-8">
              {/* Stat Cards */}
              <div className="grid grid-cols-3 gap-5 max-w-2xl mx-auto w-full">
                <Card className="p-6 bg-surface/50 border-border text-center">
                  <p className="text-muted-foreground text-sm mb-2">Total Found</p>
                  <p className="text-4xl font-bold text-foreground">{stats.total}</p>
                </Card>
                <Card className="p-6 bg-success/5 border-success/20 text-center">
                  <p className="text-success/70 text-sm mb-2">Ready to Import</p>
                  <p className="text-4xl font-bold text-success">{stats.valid}</p>
                </Card>
                <Card className="p-6 bg-danger/5 border-danger/20 text-center">
                  <p className="text-danger/70 text-sm mb-2">Needs Correction</p>
                  <p className="text-4xl font-bold text-danger">{stats.error}</p>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mx-auto" style={{ width: "320px" }}>
                <Button
                  className="w-full h-11 text-base bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
                  onClick={() => setView("review")}
                >
                  Review & Edit Data
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-10 border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                  disabled={stats.valid === 0}
                  onClick={handlePartialImport}
                >
                  {isImporting ? "Importing..." : `Fast Import ${stats.valid} Valid Rows`}
                </Button>

                <button
                  onClick={() => { setRows([]); setFile(null); setImportIssues([]); }}
                  className="text-muted-foreground hover:text-danger text-sm transition-colors mt-1 text-center"
                >
                  Start over with new file
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Review Phase UI */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/30">
                <Tabs value={filterTab} onValueChange={(value) => setFilterTab(value as typeof filterTab)} className="w-auto">
                  <TabsList className="bg-background border border-border">
                    <TabsTrigger value="all" className="gap-2">
                      All <Badge variant="secondary" className="bg-surface text-muted-foreground">{stats.total}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="valid" className="gap-2 data-[state=active]:text-success">
                      Ready <Badge variant="secondary" className="bg-success/10 text-success">{stats.valid}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="error" className="gap-2 data-[state=active]:text-danger">
                      Needs Fix <Badge variant="secondary" className="bg-danger/10 text-danger">{stats.error}</Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground mr-2">Click any cell to edit</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setView("upload")}
                    className="h-8 border-border"
                  >
                    Summary
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                {importIssues.length > 0 && (
                  <div role="alert" className="m-4 rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
                    <p className="font-semibold">The backend rejected these workbook rows:</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {importIssues.map((issue, index) => (
                        <li key={`${issue.kind}-${issue.row ?? "global"}-${index}`}>
                          {issue.row ? `Row ${issue.row}: ` : ""}
                          {issue.message}
                          {issue.appCode ? ` (${issue.appCode})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Table>
                  <TableHeader className="sticky top-0 bg-panel z-10">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead>Server Name</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Environment</TableHead>
                      <TableHead>App Code</TableHead>
                      <TableHead>App Name</TableHead>
                      <TableHead>Owner Team</TableHead>
                      <TableHead className="w-24">Port</TableHead>
                      <TableHead>Protocol</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row, index) => (
                      <TableRow 
                        key={row._id} 
                        className={`border-border/50 group ${row.status === 'error' ? 'bg-danger/[0.02]' : ''}`}
                      >
                        <TableCell className="text-center text-muted-foreground font-label text-xs">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          {row.status === "valid" ? (
                            <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/20 h-5 px-1.5">
                              Ready
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-danger/10 text-danger border-danger/20 hover:bg-danger/20 h-5 px-1.5">
                              Error
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <EditableCell 
                            value={row.data.serverName || ""} 
                            error={row.errors.serverName}
                            onChange={(val) => handleCellChange(row._id, "serverName", val)}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell 
                            value={row.data.ipAddress || ""} 
                            error={row.errors.ipAddress}
                            onChange={(val) => handleCellChange(row._id, "ipAddress", val)}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell 
                            value={row.data.environment || ""} 
                            error={row.errors.environment}
                            onChange={(val) => handleCellChange(row._id, "environment", val)}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell 
                            value={row.data.appCode || ""} 
                            error={row.errors.appCode}
                            onChange={(val) => handleCellChange(row._id, "appCode", val)}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell 
                            value={row.data.appName || ""} 
                            error={row.errors.appName}
                            onChange={(val) => handleCellChange(row._id, "appName", val)}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell 
                            value={row.data.ownerTeam || ""} 
                            error={row.errors.ownerTeam}
                            onChange={(val) => handleCellChange(row._id, "ownerTeam", val)}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell 
                            value={row.data.port || ""} 
                            error={row.errors.port}
                            onChange={(val) => handleCellChange(row._id, "port", val)}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell 
                            value={row.data.protocol || ""} 
                            error={row.errors.protocol}
                            onChange={(val) => handleCellChange(row._id, "protocol", val)}
                            placeholder="HTTP"
                          />
                        </TableCell>
                        <TableCell>
                          <button 
                            onClick={() => removeRow(row._id)}
                            className="p-1.5 text-muted-foreground/50 hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredRows.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-muted-foreground">No rows found matching this filter.</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-between items-center bg-surface/50">
          <div className="flex gap-4">
            {stats.error > 0 && (
              <div className="flex items-center gap-2 text-danger text-xs animate-pulse">
                <AlertTriangle size={14} />
                <span>{stats.error} rows still need fixing before they can be imported.</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              Cancel
            </Button>
            
            <Button 
              disabled={stats.valid === 0 || isImporting}
              className="bg-success hover:bg-success/90 min-w-[180px] relative overflow-hidden group"
              onClick={handlePartialImport}
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2 group-hover:scale-110 transition-transform" />
                  Import {stats.valid} Valid Rows
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * HELPER COMPONENT FOR INLINE EDITING
 */
function EditableCell({ 
  value, 
  error, 
  onChange, 
  placeholder 
}: { 
  value: unknown; 
  error?: string; 
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [localValue, setLocalValue] = useState(String(value));

  return (
    <div className="relative w-full group/cell">
      <Input
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        className={`h-8 text-xs bg-transparent border-transparent hover:border-border focus:border-primary focus:bg-surface/50 px-2 transition-all ${
          error ? "border-danger/50 text-danger bg-danger/5" : "text-foreground/80"
        }`}
      />
      {error && (
        <div className="absolute left-0 -bottom-1 translate-y-full z-20 hidden group-hover/cell:block">
          <div className="bg-danger/90 text-primary-foreground text-[10px] px-2 py-1 rounded shadow-lg border border-danger whitespace-nowrap">
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
