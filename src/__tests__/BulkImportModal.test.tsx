import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BulkImportModal, INVENTORY_IMPORT_HEADERS } from "../app/components/BulkImportModal";
import apiClient from "../shared/api/client";
import * as XLSX from "xlsx";
import React from "react";

// Mock API Client
vi.mock("../shared/api/client", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock XLSX
vi.mock("xlsx", () => ({
  read: vi.fn(() => ({
    SheetNames: ["Sheet1"],
    Sheets: { Sheet1: {} },
  })),
  write: vi.fn(() => new Uint8Array()),
  utils: {
    sheet_to_json: vi.fn(() => [
      { 
        "Server Name": "srv1", 
        "IP": "10.0.0.1", 
        "Environment": "Production",
        "App Code": "APP1",
        "App Name": "Application 1",
        "Owner Team": "Platform",
        "Port": "8080",
        "Protocol": "HTTP"
      }
    ]),
    json_to_sheet: vi.fn(),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
}));

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn();

// Mock crypto.randomUUID
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = vi.fn(() => "123e4567-e89b-12d3-a456-426614174000" as `${string}-${string}-${string}-${string}-${string}`);
}

/**
 * Mock FileReader so onload fires synchronously in JSDOM.
 * The real FileReader is async — JSDOM never triggers onload from
 * readAsBinaryString in a test environment, so rows never get populated
 * and the import buttons never appear. This mock calls onload immediately.
 */
class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onload: ((evt: ProgressEvent<FileReader>) => void) | null = null;
  onerror: ((evt: ProgressEvent<FileReader>) => void) | null = null;

  readAsBinaryString(_file: Blob) {
    this.result = "mock-binary-content";
    if (this.onload) {
      this.onload({ target: this } as unknown as ProgressEvent<FileReader>);
    }
  }
}

// @ts-expect-error — replace global FileReader with synchronous mock
global.FileReader = MockFileReader;

describe("BulkImportModal - Direct File Upload", () => {
  // Verbatim from AuditNode.Backend/AuditNode.Infrastructure/Services/InventoryImportService.cs Headers.
  const backendHeaders = [
    "Server Name", "IP", "Environment", "App Code", "App Name", "Owner Team", "Port", "Protocol",
  ] as const;
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
  });

  async function uploadAndFastImport() {
    const file = new File(["dummy"], "data.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    const submitButton = await screen.findByText(/Fast Import 1 Valid Rows/i);
    fireEvent.click(submitButton);
  }

  it("renders the initial upload state with correct headings", () => {
    render(<BulkImportModal onClose={mockOnClose} />);
    expect(screen.getByText("Iterative Bulk Import")).toBeDefined();
    expect(screen.getByText("Import Your Inventory")).toBeDefined();
    expect(screen.getByText("Select Excel File")).toBeDefined();
    expect(screen.getByText(
      `Required headers: ${backendHeaders.join(", ")}`,
    )).toBeDefined();
    expect(INVENTORY_IMPORT_HEADERS).toEqual(backendHeaders);
  });

  it("displays review UI after file drop and uses the standard API client on Fast Import", async () => {
    render(<BulkImportModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    const file = new File(["dummy"], "data.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });

    // FileReader mock fires synchronously → rows are populated immediately →
    // summary view with action buttons should appear
    await waitFor(() => {
      expect(screen.getAllByText(/Import.*Valid Rows/i)[0]).toBeDefined();
    });

    const submitButton = screen.getAllByText(/Import.*Valid Rows/i)[0];
    fireEvent.click(submitButton);

    await waitFor(() => {
      const generatedRows = vi.mocked(XLSX.utils.json_to_sheet).mock.calls[0][0] as Record<string, unknown>[];
      expect(Object.keys(generatedRows[0])).toEqual([
        "Server Name",
        "IP",
        "Environment",
        "App Code",
        "App Name",
        "Owner Team",
        "Port",
        "Protocol",
      ]);
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/v1/inventory/import",
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({ "Content-Type": "multipart/form-data" }),
        }),
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("maps 400 ProblemDetails import row errors into review UI without discarding the row", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: {
        status: 400,
        data: {
          title: "The inventory workbook is invalid.",
          detail: "Correct the listed workbook rows.",
          extensions: {
            import: {
              errors: [{ row: 2, type: "Validation", message: "IP must be a valid IPv4 address." }],
              conflicts: [],
            },
          },
        },
      },
    });
    render(<BulkImportModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await uploadAndFastImport();

    expect(await screen.findByText(/IP must be a valid IPv4 address/)).toBeDefined();
    expect(screen.getByDisplayValue("srv1")).toBeDefined();
    expect(screen.getByText("The backend rejected these workbook rows:")).toBeDefined();
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("maps 409 ProblemDetails conflicts into review UI and preserves submitted rows", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 409",
      response: {
        status: 409,
        data: {
          title: "The inventory workbook contains conflicts.",
          extensions: {
            import: {
              errors: [],
              conflicts: [{ row: 2, appCode: "APP1", message: "The server port is already assigned." }],
            },
          },
        },
      },
    });
    render(<BulkImportModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await uploadAndFastImport();

    expect(await screen.findByText(/The server port is already assigned/)).toBeDefined();
    expect(screen.getByDisplayValue("srv1")).toBeDefined();
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
