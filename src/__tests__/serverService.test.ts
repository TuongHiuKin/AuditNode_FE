import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "../shared/api/client";
import { ServerService } from "../services/serverService";

vi.mock("../shared/api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const payload = {
  datacenterId: "dc-1",
  ipAddress: "10.0.0.1",
  hostname: "server-1",
  osType: "Linux",
  environment: "Production",
  status: "Active",
};

describe("ServerService canonical CRUD contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses canonical detail, create, update and delete endpoints", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { id: "srv-1", ...payload } });
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

    await ServerService.getServer("srv-1");
    await ServerService.createServer(payload);
    await ServerService.updateServer("srv-1", payload);
    await ServerService.deleteServer("srv-1");

    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/servers/srv-1");
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/servers", payload);
    expect(apiClient.put).toHaveBeenCalledWith("/api/v1/servers/srv-1", payload);
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/servers/srv-1");
  });

  it("exports multiple servers with repeated ids query parameters", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    await ServerService.exportServers(["srv-1", "srv-2"]);
    const [, config] = vi.mocked(apiClient.get).mock.calls[0];
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/servers/export", expect.any(Object));
    expect((config?.params as URLSearchParams).toString()).toBe("ids=srv-1&ids=srv-2");
  });
});
