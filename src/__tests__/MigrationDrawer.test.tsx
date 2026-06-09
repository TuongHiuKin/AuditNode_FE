import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MigrationDrawer } from "../app/components/MigrationDrawer";
import apiClient from "../shared/api/client";
import { toast } from "sonner";

// Mock dependencies
vi.mock("../shared/api/client", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("MigrationDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockServers = [
    { id: "srv-1", hostname: "server-01", ipAddress: "192.168.1.1" },
    { id: "srv-2", hostname: "server-02", ipAddress: "192.168.1.2" },
  ];

  const mockApp = {
    id: "app-1",
    appName: "Test App",
    portNumber: 8080,
    serverId: "srv-1",
  };

  it("renders correctly when open and fetches data", async () => {
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url === "/api/Servers") return Promise.resolve({ data: mockServers });
      if (url === "/api/Applications/app-1") return Promise.resolve({ data: mockApp });
      return Promise.reject(new Error("Not found"));
    });

    render(
      <MigrationDrawer 
        applicationId="app-1" 
        onClose={vi.fn()} 
        onApplicationsUpdated={vi.fn()} 
        onServersUpdated={vi.fn()}
      />
    );

    expect(screen.getByText("Edit Deployment")).toBeDefined();
    
    await waitFor(() => {
      expect(screen.getByText("server-01 (192.168.1.1)")).toBeDefined();
      expect(screen.getByText("server-02 (192.168.1.2)")).toBeDefined();
    });

    const portInput = screen.getByPlaceholderText("e.g. 8080") as HTMLInputElement;
    expect(portInput.value).toBe("8080");
  });

  it("submits the migration form successfully and stays open", async () => {
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url === "/api/Servers") return Promise.resolve({ data: mockServers });
      if (url === "/api/Applications/app-1") return Promise.resolve({ data: mockApp });
      return Promise.reject(new Error("Not found"));
    });

    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { success: true } });

    const onApplicationsUpdated = vi.fn();
    const onServersUpdated = vi.fn();
    const onClose = vi.fn();

    render(
      <MigrationDrawer 
        applicationId="app-1" 
        onClose={onClose} 
        onApplicationsUpdated={onApplicationsUpdated}
        onServersUpdated={onServersUpdated}
      />
    );

    await waitFor(() => screen.getByText("server-01 (192.168.1.1)"));

    // Select a different server
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "srv-2" } });
    
    // Change port
    fireEvent.change(screen.getByPlaceholderText("e.g. 8080"), { target: { value: "9090" } });

    // Submit
    fireEvent.click(screen.getByText("Update Configuration"));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith("/api/infrastructure/apps/migrate", {
        applicationId: "app-1",
        serverId: "srv-2",
        portNumber: 9090,
      });
      expect(toast.success).toHaveBeenCalledWith("Deployment updated successfully");
      expect(onApplicationsUpdated).toHaveBeenCalled();
      expect(onServersUpdated).toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled(); // Per continuous updates requirement
    });
  });

  it("handles submission error", async () => {
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url === "/api/Servers") return Promise.resolve({ data: mockServers });
      if (url === "/api/Applications/app-1") return Promise.resolve({ data: mockApp });
      return Promise.reject(new Error("Not found"));
    });

    vi.mocked(apiClient.put).mockRejectedValueOnce({
      response: { data: { message: "Update failed" } }
    });

    render(
      <MigrationDrawer 
        applicationId="app-1" 
        onClose={vi.fn()} 
        onApplicationsUpdated={vi.fn()} 
        onServersUpdated={vi.fn()}
      />
    );

    await waitFor(() => screen.getByText("server-01 (192.168.1.1)"));

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "srv-2" } });
    fireEvent.click(screen.getByText("Update Configuration"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update failed");
    });
  });
});
