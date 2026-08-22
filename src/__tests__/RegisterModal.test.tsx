import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegisterModal } from "../app/components/RegisterModal";
import apiClient from "../shared/api/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("../shared/api/client", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe("RegisterModal", () => {
  const mockOnClose = vi.fn();
  const mockServers = [
    { id: "1", hostname: "server-1", ipAddress: "10.0.0.1" },
  ];
  const mockDatacenters = [
    { id: "dc-1", name: "HCMC - Region 1", location: "Ho Chi Minh City" }
  ];

  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/api/v1/datacenters") {
        return Promise.resolve({ data: mockDatacenters });
      }
      if (url === "/api/v1/servers") {
        return Promise.resolve({ data: mockServers });
      }
      return Promise.reject(new Error("Unknown URL"));
    });
  });

  const renderWithProvider = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it("renders in infra mode by default", () => {
    renderWithProvider(<RegisterModal onClose={mockOnClose} />);
    expect(screen.getByText("New Server")).toBeDefined();
    expect(screen.getByLabelText(/Server IP/i)).toBeDefined();
    expect(screen.getByLabelText(/Hostname/i)).toBeDefined();
  });

  it("switches to app mode when toggle is clicked", () => {
    renderWithProvider(<RegisterModal onClose={mockOnClose} />);
    fireEvent.click(screen.getByText("New Application"));
    expect(screen.getByLabelText(/Select Server/i)).toBeDefined();
    expect(screen.getByLabelText(/App Code/i)).toBeDefined();
    expect(screen.getByLabelText(/Application Name/i)).toBeDefined();
  });

  it("validates required fields in infra mode", async () => {
    renderWithProvider(<RegisterModal onClose={mockOnClose} />);
    fireEvent.click(screen.getByText("Submit Server"));
    
    await waitFor(() => {
      expect(screen.getByText(/Datacenter, IP Address, Hostname, and OS Type are required/i)).toBeDefined();
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("successfully submits server data", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    renderWithProvider(<RegisterModal onClose={mockOnClose} />);
    
    // Wait for datacenters to load
    await waitFor(() => {
      expect(screen.getByText(/HCMC - Region 1/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/Zone \/ Datacenter/i), { target: { value: "dc-1" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 10.0.x.x"), { target: { value: "192.168.1.1" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. web-node-01"), { target: { value: "web-01" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. Ubuntu 22.04"), { target: { value: "Ubuntu 22.04" } });
    
    fireEvent.click(screen.getByText("Submit Server"));
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/api/v1/servers", expect.objectContaining({
        datacenterId: "dc-1",
        ipAddress: "192.168.1.1",
        hostname: "web-01",
        osType: "Ubuntu 22.04",
      }));
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("successfully submits application data", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    renderWithProvider(<RegisterModal onClose={mockOnClose} defaultMode="app" />);
    
    // Wait for servers to load and check display format
    await waitFor(() => {
      expect(screen.getByText(/server-1 \(10.0.0.1\)/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/Select Server/i), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. FinOps Team"), { target: { value: "Team-A" } });
    fireEvent.change(screen.getByPlaceholderText("PAY-01"), { target: { value: "APP-01" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. Payment Gateway"), { target: { value: "Test App" } });
    fireEvent.change(screen.getByPlaceholderText("Key (e.g. Env)"), { target: { value: "ENV" } });
    fireEvent.change(screen.getByPlaceholderText("Value (e.g. Prod)"), { target: { value: "PROD" } });
    fireEvent.click(screen.getByText("Add"));
    
    fireEvent.click(screen.getByText("Deploy App"));
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/api/v1/applications", expect.objectContaining({
        ownerTeam: "Team-A",
        appCode: "APP-01",
        appName: "Test App",
        labels: [{ key: "ENV", value: "PROD" }],
        deployment: expect.objectContaining({
          serverId: "1",
          portNumber: 443,
          protocol: "HTTPS",
        }),
      }));
      const payload = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>;
      expect(payload).not.toHaveProperty("serverId");
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("creates application metadata without inventing a deployment", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    renderWithProvider(<RegisterModal onClose={mockOnClose} defaultMode="app" />);

    fireEvent.change(screen.getByPlaceholderText("e.g. FinOps Team"), { target: { value: "Team-A" } });
    fireEvent.change(screen.getByPlaceholderText("PAY-01"), { target: { value: "APP-02" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. Payment Gateway"), { target: { value: "Metadata App" } });
    fireEvent.click(screen.getByText("Deploy App"));

    await waitFor(() => {
      const payload = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>;
      expect(payload).toEqual(expect.objectContaining({
        appCode: "APP-02",
        appName: "Metadata App",
        ownerTeam: "Team-A",
        labels: [],
      }));
      expect(payload).not.toHaveProperty("deployment");
    });
  });

  it("calls onSuccess after successful submission", async () => {
    const mockOnSuccess = vi.fn();
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    renderWithProvider(<RegisterModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    await waitFor(() => {
      expect(screen.getByText(/HCMC - Region 1/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/Zone \/ Datacenter/i), { target: { value: "dc-1" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 10.0.x.x"), { target: { value: "192.168.1.1" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. web-node-01"), { target: { value: "web-01" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. Ubuntu 22.04"), { target: { value: "Ubuntu 22.04" } });
    
    fireEvent.click(screen.getByText("Submit Server"));
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
    expect(mockOnClose).toHaveBeenCalled();
  });
});
