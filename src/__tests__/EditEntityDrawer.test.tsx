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
  const ownerCapabilities = {
    canRead: true,
    canEditProperties: true,
    canCreate: true,
    canDelete: true,
    canChangeLabels: true,
    canChangeOwner: false,
    canManageGrants: true,
  };
  const mockServerData = {
    id: "srv-123",
    hostname: "test-server",
    ipAddress: "10.0.0.1",
    osType: "Ubuntu 22.04",
    environment: "Production",
    status: "Active",
    datacenterId: "dc-1",
    capabilities: ownerCapabilities,
  };

  const mockAppData = {
    id: "app-456",
    appName: "Test App",
    appCode: "T-01",
    ownerId: "user-1",
    ownerTeam: "DevOps",
    risk: "Low",
    icon: "box",
    techStack: ".NET",
    labels: [{ key: "ENV", value: "PROD" }],
    capabilities: ownerCapabilities,
    servers: [
      { portMappingId: "mapping-1", id: "srv-999", hostname: "old-server", ipAddress: "10.0.0.9", portNumber: 8080, protocol: "HTTP" },
      { portMappingId: "mapping-2", id: "srv-888", hostname: "second-server", ipAddress: "10.0.0.8", portNumber: 8181, protocol: "HTTP" },
    ],
  };

  const onApplicationsUpdated = vi.fn();
  const onServersUpdated = vi.fn();

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
        onApplicationsUpdated={onApplicationsUpdated}
        onServersUpdated={onServersUpdated}
      />
    );

    expect(screen.getByText(/Synchronizing resource data/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByDisplayValue("test-server")).toBeDefined();
      expect(screen.getByDisplayValue("10.0.0.1")).toBeDisabled();
    });

    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/servers/srv-123");
  });

  it("renders and fetches application data and available servers when opened", async () => {
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url.includes("/api/v1/applications")) return Promise.resolve({ data: mockAppData });
      if (url === "/api/v1/servers") return Promise.resolve({ data: [mockServerData] });
      return Promise.reject(new Error("Not found"));
    });

    render(
      <EditEntityDrawer
        entityId="app-456"
        entityType="APP"
        onClose={vi.fn()}
        onApplicationsUpdated={onApplicationsUpdated}
        onServersUpdated={onServersUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test App")).toBeDefined();
      expect(screen.getByText("Network Mapping")).toBeDefined();
      expect(screen.getByPlaceholderText("Select Target Infrastructure...")).toBeDefined();
    });

    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/applications/app-456");
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/servers");
  });

  it("updates a server through the canonical endpoint and retains the required IP address", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockServerData });
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} });

    render(
      <EditEntityDrawer
        entityId="srv-123"
        entityType="SERVER"
        onClose={vi.fn()}
        onApplicationsUpdated={onApplicationsUpdated}
        onServersUpdated={onServersUpdated}
      />
    );

    await waitFor(() => expect(screen.getByDisplayValue("test-server")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        "/api/v1/servers/srv-123",
        expect.objectContaining({ ipAddress: "10.0.0.1" }),
      );
      expect(onServersUpdated).toHaveBeenCalled();
      expect(onApplicationsUpdated).not.toHaveBeenCalled();
    });
  });

  it("submits the application form with migration fields and stays open", async () => {
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url.includes("/api/v1/applications")) return Promise.resolve({ data: mockAppData });
      if (url === "/api/v1/servers") return Promise.resolve({ data: [mockServerData] });
      return Promise.reject(new Error("Not found"));
    });
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
    const onClose = vi.fn();

    render(
      <EditEntityDrawer
        entityId="app-456"
        entityType="APP"
        onClose={onClose}
        onApplicationsUpdated={onApplicationsUpdated}
        onServersUpdated={onServersUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test App")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/Application Name/i), { target: { value: "Updated App" } });

    fireEvent.click(screen.getByRole("radio", { name: /second-server.*8181/i }));
    
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
      expect(apiClient.put).toHaveBeenCalledWith("/api/v1/applications/app-456", expect.objectContaining({
        appName: "Updated App",
        portMappingId: "mapping-2",
        serverId: "srv-123",
        portNumber: 9090,
        labels: [{ key: "ENV", value: "PROD" }],
      }));
      expect(onApplicationsUpdated).toHaveBeenCalled();
      expect(onServersUpdated).toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled(); // Per continuous updates requirement
    });
  });

  it("updates metadata and labels without changing an unselected deployment", async () => {
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url.includes("/api/v1/applications")) return Promise.resolve({ data: mockAppData });
      if (url === "/api/v1/servers") return Promise.resolve({ data: [mockServerData] });
      return Promise.reject(new Error("Not found"));
    });
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} });

    render(
      <EditEntityDrawer
        entityId="app-456"
        entityType="APP"
        onClose={vi.fn()}
        onApplicationsUpdated={onApplicationsUpdated}
        onServersUpdated={onServersUpdated}
      />
    );

    await waitFor(() => expect(screen.getByText("ENV:")).toBeDefined());
    fireEvent.change(screen.getByLabelText(/Application Name/i), { target: { value: "Metadata only" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      const payload = vi.mocked(apiClient.put).mock.calls[0][1] as Record<string, unknown>;
      expect(payload).toEqual(expect.objectContaining({
        appName: "Metadata only",
        ownerTeam: "DevOps",
        labels: [{ key: "ENV", value: "PROD" }],
      }));
      expect(payload).not.toHaveProperty("portMappingId");
      expect(payload).not.toHaveProperty("serverId");
      expect(payload).not.toHaveProperty("portNumber");
      expect(payload).not.toHaveProperty("appCode");
      expect(onApplicationsUpdated).toHaveBeenCalled();
      expect(onServersUpdated).not.toHaveBeenCalled();
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
        onApplicationsUpdated={onApplicationsUpdated}
        onServersUpdated={onServersUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Fetch Failed")).toBeDefined();
      expect(screen.getByText("API Error")).toBeDefined();
    });
    
    expect(onClose).not.toHaveBeenCalled();
  });
});
