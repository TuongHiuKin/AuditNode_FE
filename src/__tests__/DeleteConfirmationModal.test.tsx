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

  it("renders safe message when no dependencies exist for APP", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { count: 0 } });

    render(
      <DeleteConfirmationModal 
        entityId="app-1" 
        entityName="Test App" 
        entityType="APP"
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to permanently delete/)).toBeDefined();
      expect(screen.getAllByText("Test App").length).toBeGreaterThan(0);
    });
  });

  it("renders critical warning when dependencies exist for APP", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { count: 5 } });

    render(
      <DeleteConfirmationModal 
        entityId="app-1" 
        entityName="Test App" 
        entityType="APP"
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Critical Impact Warning")).toBeDefined();
      expect(screen.getByText(/active network connection/)).toBeDefined();
      expect(screen.getByText(/5/)).toBeDefined();
    });
  });

  it("renders server impact warning when apps are deployed", async () => {
    const mockDeployedApps = [
      { id: "app-1", appName: "App 1", portNumber: 80 },
      { id: "app-2", appName: "App 2", portNumber: 443 },
    ];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockDeployedApps });

    render(
      <DeleteConfirmationModal 
        entityId="srv-1" 
        entityName="Prod Server" 
        entityType="SERVER"
        onClose={vi.fn()} 
        onSuccess={vi.fn()} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Critical Impact Warning")).toBeDefined();
      expect(screen.getByText(/actively hosting/)).toBeDefined();
      expect(screen.getByText(/2\s+applications/i)).toBeDefined();
      expect(screen.getByText("App 1")).toBeDefined();
      expect(screen.getByText("App 2")).toBeDefined();
    });
  });

  it("calls purge API for APP and triggers success", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { count: 0 } });
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { success: true } });

    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <DeleteConfirmationModal 
        entityId="app-1" 
        entityName="Test App" 
        entityType="APP"
        onClose={onClose} 
        onSuccess={onSuccess} 
      />
    );

    await waitFor(() => screen.getByText("Confirm Delete"));

    fireEvent.click(screen.getByText("Confirm Delete"));

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/infrastructure/apps/app-1/purge");
      expect(toast.success).toHaveBeenCalledWith("Application purged successfully");
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("calls purge API for SERVER and triggers success", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { success: true } });

    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <DeleteConfirmationModal 
        entityId="srv-1" 
        entityName="Prod Server" 
        entityType="SERVER"
        onClose={onClose} 
        onSuccess={onSuccess} 
      />
    );

    await waitFor(() => screen.getByText("Confirm Delete"));

    fireEvent.click(screen.getByText("Confirm Delete"));

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/servers/srv-1");
      expect(toast.success).toHaveBeenCalledWith("Server deleted successfully");
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
