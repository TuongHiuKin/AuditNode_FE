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
  read: vi.fn(() => ({
    SheetNames: ["Sheet1"],
    Sheets: { Sheet1: {} },
  })),
  write: vi.fn(() => new Uint8Array()),
  utils: {
    sheet_to_json: vi.fn(() => [
      { 
        "Server Name": "srv1", 
        "IP Address": "10.0.0.1", 
        "Environment": "Production",
        "App Code": "APP1",
        "App Name": "Application 1",
        "Port": "8080"
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

describe("BulkImportModal - Direct File Upload", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it("renders the initial upload state with correct headings", () => {
    render(<BulkImportModal onClose={mockOnClose} />);
    expect(screen.getByText("Iterative Bulk Import")).toBeDefined();
    expect(screen.getByText("Import Your Inventory")).toBeDefined();
    expect(screen.getByText("Select Excel File")).toBeDefined();
  });

  it("displays review UI after file drop and calls fetch on Fast Import", async () => {
    render(<BulkImportModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    const file = new File(["dummy"], "data.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getAllByText(/Import.*Valid Rows/i)[0]).toBeDefined();
    });

    const submitButton = screen.getAllByText(/Import.*Valid Rows/i)[0];
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://localhost:7126/api/v1/inventory/bulk-import",
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData)
        })
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
