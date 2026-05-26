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
      if (url === "/api/Datacenters") {
        return Promise.resolve({ data: mockDatacenters });
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
    fireEvent.click(screen.getByText("Register Server"));
    
    await waitFor(() => {
      expect(screen.getByText(/Datacenter, IP Address, and Hostname are required/i)).toBeDefined();
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
    
    fireEvent.click(screen.getByText("Register Server"));
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/api/Servers", expect.objectContaining({
        datacenterId: "dc-1",
        ipAddress: "192.168.1.1",
        hostname: "web-01",
      }));
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("successfully submits application data", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    renderWithProvider(<RegisterModal onClose={mockOnClose} servers={mockServers} defaultMode="app" />);
    
    fireEvent.change(screen.getByLabelText(/Select Server/i), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. FinOps"), { target: { value: "Team-A" } });
    fireEvent.change(screen.getByPlaceholderText("PAY-01"), { target: { value: "APP-01" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. Payment Gateway"), { target: { value: "Test App" } });
    
    fireEvent.click(screen.getByText("Deploy App"));
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/api/Applications", expect.objectContaining({
        serverId: "1",
        ownerId: "Team-A",
        appCode: "APP-01",
        appName: "Test App",
      }));
    });
    expect(mockOnClose).toHaveBeenCalled();
  });
});
