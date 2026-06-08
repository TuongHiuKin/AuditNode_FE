import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeleteConfirmationModal } from "../app/components/DeleteConfirmationModal";
import apiClient from "../shared/api/client";
import { toast } from "sonner";

// Mock dependencies
vi.mock("../shared/api/client", () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("DeleteConfirmationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders safe message when no dependencies exist", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { count: 0 } });

    render(
      <DeleteConfirmationModal 
        applicationId="app-1" 
        appName="Test App" 
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to permanently delete/)).toBeDefined();
      // Use getAllByText because it appears in header and message
      expect(screen.getAllByText("Test App").length).toBeGreaterThan(0);
    });
  });

  it("renders critical warning when dependencies exist", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { count: 5 } });

    render(
      <DeleteConfirmationModal 
        applicationId="app-1" 
        appName="Test App" 
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Critical Warning")).toBeDefined();
      expect(screen.getByText(/active network connection/)).toBeDefined();
      // Match 5 within the span that contains the full text
      expect(screen.getByText(/5/)).toBeDefined();
    });
  });

  it("calls delete API and triggers success", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { count: 0 } });
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { success: true } });

    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <DeleteConfirmationModal 
        applicationId="app-1" 
        appName="Test App" 
        onClose={onClose} 
        onSuccess={onSuccess} 
      />
    );

    await waitFor(() => screen.getByText("Confirm Delete"));

    fireEvent.click(screen.getByText("Confirm Delete"));

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith("/api/infrastructure/apps/app-1/purge");
      expect(toast.success).toHaveBeenCalledWith("Application purged successfully");
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
