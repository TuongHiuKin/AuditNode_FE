import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "../shared/api/client";
import { ApplicationService } from "../services/applicationService";

vi.mock("../shared/api/client", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

describe("ApplicationService Phase 6 contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes supported label filters to the canonical list endpoint", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    await ApplicationService.getApplications({ labelKey: "ENV", labelValue: "PROD" });
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/applications", {
      params: { labelKey: "ENV", labelValue: "PROD" },
    });
  });

  it("blocks Guid.Empty for explicit deployment operations", async () => {
    await expect(ApplicationService.migrateDeployment({
      portMappingId: "00000000-0000-0000-0000-000000000000",
      serverId: "srv-1",
      portNumber: 8080,
    })).rejects.toThrow(/deployment/i);
    expect(apiClient.put).not.toHaveBeenCalled();
  });
});
