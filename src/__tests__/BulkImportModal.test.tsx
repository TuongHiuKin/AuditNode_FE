import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BulkImportModal } from "../app/components/BulkImportModal";
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
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
}));

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn();

// Mock crypto.randomUUID
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = vi.fn(() => "test-uuid-" + Math.random());
}

describe("BulkImportModal - Iterative Workflow", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the initial upload state with correct headings", () => {
    render(<BulkImportModal onClose={mockOnClose} />);
    expect(screen.getByText("Iterative Bulk Import")).toBeDefined();
    expect(screen.getByText("Import Your Inventory")).toBeDefined();
    expect(screen.getByText("Select Excel File")).toBeDefined();
  });

  it("handles file selection and displays summary stats", async () => {
    // Setup XLSX mock to return one valid and one error row
    vi.mocked(XLSX.read).mockReturnValue({
      SheetNames: ["Sheet1"],
      Sheets: { Sheet1: {} },
    } as any);
    
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
      { "Server Name": "Server1", "IP": "10.0.0.1", "App Name": "App1", "App Code": "C1", "Port": "80" }, // Valid
      { "Server Name": "", "IP": "invalid", "App Name": "App2", "App Code": "C2", "Port": "abc" },      // Error
    ]);

    render(<BulkImportModal onClose={mockOnClose} />);
    
    const file = new File(["dummy"], "data.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      // Check summary stats
      expect(screen.getByText("Total Found")).toBeDefined();
      expect(screen.getAllByText("2")).toHaveLength(1); // 2 total
      expect(screen.getAllByText("1")).toHaveLength(2); // 1 valid, 1 error
    });
  });

  it("transitions to review grid and allows inline editing", async () => {
    vi.mocked(XLSX.read).mockReturnValue({ SheetNames: ["S1"], Sheets: { S1: {} } } as any);
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
      { "Server Name": "", "IP": "1.1.1.1", "App Name": "A1", "App Code": "C1", "Port": "80" } // Error (missing server name)
    ]);

    render(<BulkImportModal onClose={mockOnClose} />);
    
    const file = new File(["dummy"], "data.xlsx", { type: "xlsx" });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });

    await waitFor(() => screen.getByText("Review & Edit Data"));
    fireEvent.click(screen.getByText("Review & Edit Data"));

    // Should see the error badge
    expect(screen.getByText("Error")).toBeDefined();

    // Find the server name input (it should be empty)
    const inputs = screen.getAllByRole("textbox");
    // serverName is usually the first editable field in our table
    const serverNameInput = inputs.find(i => (i as HTMLInputElement).value === "") as HTMLInputElement;
    
    expect(serverNameInput).toBeDefined();

    // Fix the error
    fireEvent.change(serverNameInput, { target: { value: "FixedServer" } });

    // Status should change to Ready (appears in Tab and in Table cell)
    await waitFor(() => {
      expect(screen.getAllByText("Ready")).toHaveLength(2);
      expect(screen.queryByText("Error")).toBeNull();
    });
  });

  it("executes partial import and removes successful rows", async () => {
    vi.mocked(XLSX.read).mockReturnValue({ SheetNames: ["S1"], Sheets: { S1: {} } } as any);
    vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
      { "Server Name": "S1", "IP": "1.1.1.1", "App Name": "A1", "App Code": "C1", "Port": "80" }, // Valid
      { "Server Name": "", "IP": "2.2.2.2", "App Name": "A2", "App Code": "C2", "Port": "443" } // Error
    ]);

    vi.mocked(apiClient.post).mockResolvedValue({ status: 200 });

    render(<BulkImportModal onClose={mockOnClose} />);
    
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File([], "f.xlsx")] } });

    await waitFor(() => screen.getByText("Import 1 Valid Rows"));
    
    fireEvent.click(screen.getByText("Import 1 Valid Rows"));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled();
      // Only the error row should remain
      expect(screen.getByText("Total Found")).toBeDefined();
      // After success, it might stay on summary or go to grid. 
      // Our logic stays on summary but updates counts, or goes to grid if filter was 'error'
    });
  });
});
