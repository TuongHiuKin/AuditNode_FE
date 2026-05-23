import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegisterModal } from "../app/components/RegisterModal";
import apiClient from "../shared/api/client";

vi.mock("../shared/api/client", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("RegisterModal", () => {
  const mockOnClose = vi.fn();
  const mockServers = [
    { id: "1", hostname: "server-1", ipAddress: "10.0.0.1" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders in infra mode by default", () => {
    render(<RegisterModal onClose={mockOnClose} />);
    expect(screen.getByText("New Infrastructure")).toBeDefined();
    expect(screen.getByLabelText(/Server IP/i)).toBeDefined();
    expect(screen.getByLabelText(/Hostname/i)).toBeDefined();
  });

  it("switches to app mode when toggle is clicked", () => {
    render(<RegisterModal onClose={mockOnClose} />);
    fireEvent.click(screen.getByText("App Deployment"));
    expect(screen.getByLabelText(/Select Server/i)).toBeDefined();
    expect(screen.getByLabelText(/App Code/i)).toBeDefined();
    expect(screen.getByLabelText(/Application Name/i)).toBeDefined();
  });

  it("validates required fields in infra mode", async () => {
    render(<RegisterModal onClose={mockOnClose} />);
    fireEvent.click(screen.getByText("Submit Server"));
    
    await waitFor(() => {
      expect(screen.getByText(/IP Address and Hostname are required/i)).toBeDefined();
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("successfully submits server data", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    render(<RegisterModal onClose={mockOnClose} />);
    
    fireEvent.change(screen.getByPlaceholderText("e.g. 10.0.x.x"), { target: { value: "192.168.1.1" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. web-node-01"), { target: { value: "web-01" } });
    
    fireEvent.click(screen.getByText("Submit Server"));
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/api/Servers", expect.objectContaining({
        ipAddress: "192.168.1.1",
        hostname: "web-01",
      }));
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("successfully submits application data", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    render(<RegisterModal onClose={mockOnClose} servers={mockServers} defaultMode="app" />);
    
    fireEvent.change(screen.getByLabelText(/Select Server/i), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("PAY-01"), { target: { value: "APP-01" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. Payment Gateway"), { target: { value: "Test App" } });
    
    fireEvent.click(screen.getByText("Deploy Application"));
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/api/Applications", expect.objectContaining({
        serverId: "1",
        appCode: "APP-01",
        appName: "Test App",
      }));
    });
    expect(mockOnClose).toHaveBeenCalled();
  });
});
