import { X, Download, Upload, AlertCircle, CheckCircle, AlertTriangle, ChevronRight, Save, Trash2 } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
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

/**
 * CORE DATA STRUCTURES
 */
type ImportRow = {
  _id: string;
  status: "valid" | "error";
  errors: Record<string, string>;
  data: Record<string, any>;
};

export interface BulkImportModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * MOCK VALIDATION ENGINE
 * In a real app, this would match your backend schema
 */
const validateRow = (data: any): Record<string, string> => {
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

  // 4. Optional Field Validation (if provided)
  if (data.environment && !["Production", "Staging", "Development", "UAT"].includes(data.environment)) {
    errors.environment = "Invalid Environment value";
  }

  return errors;
};

export function BulkImportModal({ onClose, onSuccess }: BulkImportModalProps) {
  // State Management
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [view, setView] = useState<"upload" | "review">("upload");
  const [filterTab, setFilterTab] = useState<"all" | "valid" | "error">("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

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
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);

        const normalizedRows: ImportRow[] = rawData.map((row: any) => {
          // Normalize Excel headers to internal camelCase keys
          const mappedData = {
            serverName: row['Server Name'] || row['ServerName'] || '',
            ipAddress: row['IP Address'] || row['IP'] || '',
            environment: row['Environment'] || '',
            appCode: row['App Code'] || row['AppCode'] || '',
            appName: row['App Name'] || row['AppName'] || '',
            ownerTeam: row['Owner Team'] || row['OwnerTeam'] || '',
            port: row['Port'] || '',
            protocol: row['Protocol'] || ''
          };

          const errors = validateRow(mappedData);
          return {
            _id: crypto.randomUUID(),
            status: Object.keys(errors).length === 0 ? "valid" : "error",
            errors,
            data: mappedData,
          };
        });

        setRows(normalizedRows);
        setIsProcessing(false);
      };
      reader.readAsBinaryString(selectedFile);
    } catch (err) {
      console.error("Parsing error", err);
      toast.error("Failed to parse Excel file");
      setIsProcessing(false);
    }
  };

  /**
   * PHASE 2: INLINE EDITING LOGIC
   */
  const handleCellChange = (rowId: string, field: string, value: string) => {
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
    
    // Extract only the clean data for backend
    const payload = validRows.map(r => r.data);

    try {
      await apiClient.post("/api/v1/inventory/bulk-import", payload);
      
      toast.success(`Successfully imported ${validRows.length} rows`);
      
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
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Bulk import failed");
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
    } catch (err: any) {
      toast.error("Failed to download template");
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl min-w-[600px] flex flex-col overflow-hidden max-h-[95vh]"
        style={{ animation: "exportModalIn 0.2s ease-out both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Iterative Bulk Import
              {rows.length > 0 && (
                <Badge variant="outline" className="border-slate-700 text-slate-400 font-normal">
                  {stats.total} Total Rows
                </Badge>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Parse, fix errors inline, and selectively import valid records.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {view === "upload" && rows.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center gap-8">
              {/* Icon + heading */}
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-500 ring-1 ring-blue-500/20">
                  <Upload size={32} />
                </div>
                <div className="space-y-2 w-80 text-center">
                  <h4 className="text-2xl font-bold text-white">Import Your Inventory</h4>
                  <p className="text-slate-400 leading-relaxed">
                    Drop your Excel file here. Our system will automatically detect errors and let you fix them before committing to the database.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500">
                  <Download size={16} />
                  Download Template
                </Button>

                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileDrop}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    disabled={isProcessing}
                  />
                  <Button disabled={isProcessing} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/30">
                    {isProcessing ? "Processing..." : "Select Excel File"}
                    {!isProcessing && <ChevronRight size={16} />}
                  </Button>
                </div>
              </div>

              {/* Feature hints */}
              <div className="pt-6 border-t border-slate-800 w-full max-w-lg">
                <div className="flex justify-center gap-8 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-500" /> Automatic Validation</span>
                  <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-500" /> Inline Fixing</span>
                  <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-500" /> Partial Imports</span>
                </div>
              </div>
            </div>
          ) : view === "upload" && rows.length > 0 ? (
            <div className="p-10 h-full flex flex-col justify-center gap-8">
              {/* Stat Cards */}
              <div className="grid grid-cols-3 gap-5 max-w-2xl mx-auto w-full">
                <Card className="p-6 bg-slate-900/50 border-slate-800 text-center">
                  <p className="text-slate-400 text-sm mb-2">Total Found</p>
                  <p className="text-4xl font-bold text-white">{stats.total}</p>
                </Card>
                <Card className="p-6 bg-green-500/5 border-green-500/20 text-center">
                  <p className="text-green-500/70 text-sm mb-2">Ready to Import</p>
                  <p className="text-4xl font-bold text-green-400">{stats.valid}</p>
                </Card>
                <Card className="p-6 bg-red-500/5 border-red-500/20 text-center">
                  <p className="text-red-500/70 text-sm mb-2">Needs Correction</p>
                  <p className="text-4xl font-bold text-red-400">{stats.error}</p>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mx-auto" style={{ width: "320px" }}>
                <Button
                  className="w-full h-11 text-base bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-900/20"
                  onClick={() => setView("review")}
                >
                  Review & Edit Data
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-10 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"
                  disabled={stats.valid === 0}
                  onClick={handlePartialImport}
                >
                  {isImporting ? "Importing..." : `Fast Import ${stats.valid} Valid Rows`}
                </Button>

                <button
                  onClick={() => { setRows([]); setFile(null); }}
                  className="text-slate-500 hover:text-red-400 text-sm transition-colors mt-1 text-center"
                >
                  Start over with new file
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Review Phase UI */}
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/30">
                <Tabs value={filterTab} onValueChange={(v: any) => setFilterTab(v)} className="w-auto">
                  <TabsList className="bg-slate-950 border border-slate-800">
                    <TabsTrigger value="all" className="gap-2">
                      All <Badge variant="secondary" className="bg-slate-800 text-slate-400">{stats.total}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="valid" className="gap-2 data-[state=active]:text-green-400">
                      Ready <Badge variant="secondary" className="bg-green-500/10 text-green-500">{stats.valid}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="error" className="gap-2 data-[state=active]:text-red-400">
                      Needs Fix <Badge variant="secondary" className="bg-red-500/10 text-red-500">{stats.error}</Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-3">
                  <p className="text-xs text-slate-500 mr-2">Click any cell to edit</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setView("upload")}
                    className="h-8 border-slate-800"
                  >
                    Summary
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <Table>
                  <TableHeader className="sticky top-0 bg-[#0f172a] z-10">
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead>Server Name</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>App Name</TableHead>
                      <TableHead className="w-24">Port</TableHead>
                      <TableHead>Env</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row, index) => (
                      <TableRow 
                        key={row._id} 
                        className={`border-slate-800/50 group ${row.status === 'error' ? 'bg-red-500/[0.02]' : ''}`}
                      >
                        <TableCell className="text-center text-slate-500 font-mono text-xs">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          {row.status === "valid" ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20 h-5 px-1.5">
                              Ready
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 h-5 px-1.5">
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
                            value={row.data.appName || ""} 
                            error={row.errors.appName}
                            onChange={(val) => handleCellChange(row._id, "appName", val)}
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
                            value={row.data.environment || ""} 
                            error={row.errors.environment}
                            onChange={(val) => handleCellChange(row._id, "environment", val)}
                            placeholder="Prod..."
                          />
                        </TableCell>
                        <TableCell>
                          <button 
                            onClick={() => removeRow(row._id)}
                            className="p-1.5 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
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
                    <p className="text-slate-500">No rows found matching this filter.</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex gap-4">
            {stats.error > 0 && (
              <div className="flex items-center gap-2 text-red-400 text-xs animate-pulse">
                <AlertTriangle size={14} />
                <span>{stats.error} rows still need fixing before they can be imported.</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
              Cancel
            </Button>
            
            <Button 
              disabled={stats.valid === 0 || isImporting}
              className="bg-green-600 hover:bg-green-700 min-w-[180px] relative overflow-hidden group"
              onClick={handlePartialImport}
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
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
  value: any; 
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
        className={`h-8 text-xs bg-transparent border-transparent hover:border-slate-700 focus:border-blue-500 focus:bg-slate-900/50 px-2 transition-all ${
          error ? "border-red-500/50 text-red-400 bg-red-500/5" : "text-slate-300"
        }`}
      />
      {error && (
        <div className="absolute left-0 -bottom-1 translate-y-full z-20 hidden group-hover/cell:block">
          <div className="bg-red-900 text-red-100 text-[10px] px-2 py-1 rounded shadow-lg border border-red-700 whitespace-nowrap">
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
