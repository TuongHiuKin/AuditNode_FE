import { X, Download, Upload, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import apiClient from "../../shared/api/client";

interface ImportResult {
  totalProcessed: number;
  savedCount: number;
  errors: Array<{ row?: number; message: string; details?: string }>;
  conflicts: Array<{ row?: number; message: string; details?: string }>;
}

export interface BulkImportModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function BulkImportModal({ onClose, onSuccess }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadTemplate = async () => {
    try {
      const response = await apiClient.get("/api/inventory/import-template", {
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
      console.error("Failed to download template", err);
      setError("Failed to download template. Please try again later.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiClient.post<ImportResult>("/api/inventory/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    if (result && result.savedCount > 0) {
      onSuccess?.();
    }
    onClose();
  };

  const hasIssues = result && (result.errors.length > 0 || result.conflicts.length > 0);

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4" onClick={onClose}>
      <div
        className="bg-[#0f172a] border border-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-800">
          <h3 className="text-xl font-bold text-white">Bulk Import Inventory</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3 items-start">
              <AlertCircle className="text-red-400 shrink-0" size={20} />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {!result ? (
            <div className="space-y-6">
              <div className="bg-[#1e293b]/50 p-4 rounded-lg border border-gray-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-200">Need a template?</h4>
                  <p className="text-xs text-gray-400">Download our formatted Excel template to ensure data compatibility.</p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium py-2 px-4 rounded-lg transition-colors border border-gray-700"
                >
                  <Download size={14} />
                  Download Template
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">Upload Excel File</label>
                <div className="border-2 border-dashed border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center gap-4 bg-[#0b1120] hover:border-blue-500/50 transition-colors group relative">
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                    <Upload size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-300 font-medium">
                      {file ? file.name : "Click or drag to upload Excel file"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Only .xlsx files are supported</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              {result.savedCount > 0 && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex gap-3 items-center">
                  <CheckCircle className="text-green-400 shrink-0" size={20} />
                  <p className="text-green-400 text-sm font-medium">
                    Successfully imported {result.savedCount} of {result.totalProcessed} items.
                  </p>
                </div>
              )}

              {/* Errors Table */}
              {result.errors.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle size={18} />
                    <h4 className="text-sm font-semibold">Validation Errors ({result.errors.length})</h4>
                  </div>
                  <div className="border border-red-900/30 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-red-900/20 text-red-300 uppercase font-bold tracking-wider">
                        <tr>
                          <th className="px-4 py-2 w-16">Row</th>
                          <th className="px-4 py-2">Issue</th>
                        </tr>
                      </thead>
                      <tbody className="bg-red-900/5 divide-y divide-red-900/20">
                        {result.errors.map((err, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-red-400">{err.row || "-"}</td>
                            <td className="px-4 py-2 text-red-200">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Conflicts Table */}
              {result.conflicts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertTriangle size={18} />
                    <h4 className="text-sm font-semibold">Data Conflicts ({result.conflicts.length})</h4>
                  </div>
                  <div className="border border-amber-900/30 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-amber-900/20 text-amber-300 uppercase font-bold tracking-wider">
                        <tr>
                          <th className="px-4 py-2 w-16">Row</th>
                          <th className="px-4 py-2">Conflict</th>
                        </tr>
                      </thead>
                      <tbody className="bg-amber-900/5 divide-y divide-amber-900/20">
                        {result.conflicts.map((conf, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-amber-400">{conf.row || "-"}</td>
                            <td className="px-4 py-2 text-amber-200">{conf.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-4 p-5 border-t border-gray-800">
          {!result ? (
            <>
              <button
                onClick={onClose}
                disabled={loading}
                className="text-sm font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={loading || !file}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-5 rounded-lg transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 active:scale-95 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload & Process
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleDone}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-8 rounded-lg transition-colors shadow-lg shadow-blue-900/20 active:scale-95"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
