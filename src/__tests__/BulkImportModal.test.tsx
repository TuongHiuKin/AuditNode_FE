import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BulkImportModal } from "../app/components/BulkImportModal";
import apiClient from "../shared/api/client";
import React from "react";

vi.mock("../shared/api/client", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn();

describe("BulkImportModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the initial upload state", () => {
    render(<BulkImportModal onClose={mockOnClose} />);
    expect(screen.getByText("Bulk Import Inventory")).toBeDefined();
    expect(screen.getByText("Need a template?")).toBeDefined();
    expect(screen.getByText("Download Template")).toBeDefined();
    expect(screen.getByText("Upload & Process")).toBeDefined();
  });

  it("triggers download template action", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: new Blob() });
    
    render(<BulkImportModal onClose={mockOnClose} />);
    fireEvent.click(screen.getByText("Download Template"));
    
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/api/inventory/import-template", expect.objectContaining({
        responseType: "blob"
      }));
    });
  });

  it("handles file selection and upload success", async () => {
    const mockResult = {
      totalProcessed: 10,
      savedCount: 10,
      errors: [],
      conflicts: [],
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: mockResult });
    
    render(<BulkImportModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    const file = new File(["test"], "test.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Using fireEvent.change on the hidden input
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(screen.getByText("test.xlsx")).toBeDefined();
    
    fireEvent.click(screen.getByText("Upload & Process"));
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled();
      expect(screen.getByText(/Successfully imported 10 of 10 items/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText("Done"));
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("renders errors table when validation fails", async () => {
    const mockResult = {
      totalProcessed: 5,
      savedCount: 2,
      errors: [{ row: 3, message: "Invalid App Code" }],
      conflicts: [],
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: mockResult });
    
    render(<BulkImportModal onClose={mockOnClose} />);
    
    const file = new File(["test"], "test.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    
    fireEvent.click(screen.getByText("Upload & Process"));
    
    await waitFor(() => {
      expect(screen.getByText("Validation Errors (1)")).toBeDefined();
      expect(screen.getByText("Invalid App Code")).toBeDefined();
      expect(screen.getByText("3")).toBeDefined();
    });
  });

  it("renders conflicts table when data collision occurs", async () => {
    const mockResult = {
      totalProcessed: 5,
      savedCount: 2,
      errors: [],
      conflicts: [{ row: 4, message: "IP Address already exists" }],
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: mockResult });
    
    render(<BulkImportModal onClose={mockOnClose} />);
    
    const file = new File(["test"], "test.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    
    fireEvent.click(screen.getByText("Upload & Process"));
    
    await waitFor(() => {
      expect(screen.getByText("Data Conflicts (1)")).toBeDefined();
      expect(screen.getByText("IP Address already exists")).toBeDefined();
      expect(screen.getByText("4")).toBeDefined();
    });
  });
});
