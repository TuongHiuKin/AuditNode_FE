import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditEntityDrawer } from "../app/components/EditEntityDrawer";
import apiClient from "../shared/api/client";

// Mock apiClient
vi.mock("../shared/api/client", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("EditEntityDrawer", () => {
  const mockServerData = {
    id: "srv-123",
    hostname: "test-server",
    ipAddress: "10.0.0.1",
    osType: "Ubuntu 22.04",
    environment: "Production",
    status: "Active",
    datacenterId: "dc-1",
  };

  const mockAppData = {
    id: "app-456",
    appName: "Test App",
    appCode: "T-01",
    ownerId: "user-1",
    ownerTeam: "DevOps",
    portNumber: 8080,
    protocol: "HTTP",
    risk: "Low",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders and fetches server data when opened", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockServerData });

    render(
      <EditEntityDrawer
        entityId="srv-123"
        entityType="SERVER"
        onClose={vi.fn()}
        onUpdateSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Synchronizing resource data/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByDisplayValue("test-server")).toBeDefined();
      expect(screen.getByDisplayValue("10.0.0.1")).toBeDisabled();
    });

    expect(apiClient.get).toHaveBeenCalledWith("/api/Servers/srv-123");
  });

  it("renders and fetches application data when opened", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockAppData });

    render(
      <EditEntityDrawer
        entityId="app-456"
        entityType="APP"
        onClose={vi.fn()}
        onUpdateSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test App")).toBeDefined();
      expect(screen.getByDisplayValue("T-01")).toBeDisabled();
    });

    expect(apiClient.get).toHaveBeenCalledWith("/api/Applications/app-456");
  });

  it("submits the form successfully", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockServerData });
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
    const onUpdateSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <EditEntityDrawer
        entityId="srv-123"
        entityType="SERVER"
        onClose={onClose}
        onUpdateSuccess={onUpdateSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("test-server")).toBeDefined();
    });

    const hostnameInput = screen.getByDisplayValue("test-server");
    fireEvent.change(hostnameInput, { target: { value: "updated-server" } });

    const saveButton = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith("/api/Servers/srv-123", expect.objectContaining({
        hostname: "updated-server",
      }));
      expect(onUpdateSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("handles fetch failure gracefully by showing error message", async () => {
    vi.mocked(apiClient.get).mockRejectedValue({
      response: { data: { message: "API Error" } }
    });
    const onClose = vi.fn();

    render(
      <EditEntityDrawer
        entityId="srv-123"
        entityType="SERVER"
        onClose={onClose}
        onUpdateSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Fetch Failed")).toBeDefined();
      expect(screen.getByText("API Error")).toBeDefined();
    });
    
    expect(onClose).not.toHaveBeenCalled();
  });
});
