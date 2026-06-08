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

  it("renders and fetches application data and available servers when opened", async () => {
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url.includes("/api/Applications")) return Promise.resolve({ data: mockAppData });
      if (url === "/api/Servers") return Promise.resolve({ data: [mockServerData] });
      return Promise.reject(new Error("Not found"));
    });

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
      expect(screen.getByText("Network Mapping")).toBeDefined();
      expect(screen.getByPlaceholderText("Select Target Infrastructure...")).toBeDefined();
    });

    expect(apiClient.get).toHaveBeenCalledWith("/api/Applications/app-456");
    expect(apiClient.get).toHaveBeenCalledWith("/api/Servers");
  });

  it("submits the application form with migration fields", async () => {
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url.includes("/api/Applications")) return Promise.resolve({ data: mockAppData });
      if (url === "/api/Servers") return Promise.resolve({ data: [mockServerData] });
      return Promise.reject(new Error("Not found"));
    });
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
    const onUpdateSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <EditEntityDrawer
        entityId="app-456"
        entityType="APP"
        onClose={onClose}
        onUpdateSuccess={onUpdateSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test App")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/Application Name/i), { target: { value: "Updated App" } });
    
    // Open combobox and select target server
    const combobox = screen.getByPlaceholderText("Select Target Infrastructure...");
    fireEvent.click(combobox);
    
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /test-server/i })).toBeDefined();
    });
    
    fireEvent.click(screen.getByRole("option", { name: /test-server/i }));
    
    fireEvent.change(screen.getByLabelText(/Port Number/i), { target: { value: "9090" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith("/api/Applications/app-456", expect.objectContaining({
        appName: "Updated App",
        targetServerId: "srv-123",
        newPortNumber: 9090,
      }));
      expect(onUpdateSuccess).toHaveBeenCalled();
    });
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
