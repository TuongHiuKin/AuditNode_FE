import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "../shared/api/client";
import { workspaceSharingApi } from "../features/workspace-sharing/api/workspaceSharing";

vi.mock("../shared/api/client", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
const workspaceId = "11111111-1111-4111-8111-111111111111";

describe("workspaceSharingApi", () => {
  beforeEach(() => vi.clearAllMocks());
  it("uses the workspace share collection contract", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    await workspaceSharingApi.list(workspaceId);
    expect(apiClient.get).toHaveBeenCalledWith(`/api/v1/workspaces/${workspaceId}/shares`);
  });
  it("maps and sends the workspace admin role used by the backend contract", async () => {
    const share = { userId: "manager", role: "workspace_admin", scopeMode: "all", targetIds: [], version: 1 } as const;
    vi.mocked(apiClient.get).mockResolvedValue({ data: [share] });
    vi.mocked(apiClient.post).mockResolvedValue({ data: share });

    const listed = await workspaceSharingApi.list(workspaceId);
    await workspaceSharingApi.grant(workspaceId, { ...share, targetIds: [] });

    expect(listed).toEqual([share]);
    expect(apiClient.post).toHaveBeenCalledWith(
      `/api/v1/workspaces/${workspaceId}/shares`,
      expect.objectContaining({ role: "workspace_admin" }),
    );
  });
  it("sends role and scope targets when granting access", async () => {
    const body = { userId: "user-2", role: "auditor", scopeMode: "labels", targetIds: ["label-1"] } as const;
    vi.mocked(apiClient.post).mockResolvedValue({ data: { ...body, version: 1 } });
    await workspaceSharingApi.grant(workspaceId, { ...body, targetIds: [...body.targetIds] });
    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/workspaces/${workspaceId}/shares`, expect.objectContaining(body));
  });
  it("sends the current version when revoking access", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({});
    await workspaceSharingApi.revoke(workspaceId, "user/2", 7);
    expect(apiClient.delete).toHaveBeenCalledWith(`/api/v1/workspaces/${workspaceId}/shares/user%2F2`, { params: { version: 7 } });
  });
  it("loads searchable share candidates and scope targets", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { users: [], labels: [], frames: [] } });
    const controller = new AbortController();
    await workspaceSharingApi.options(workspaceId, "alice", controller.signal);
    expect(apiClient.get).toHaveBeenCalledWith(`/api/v1/workspaces/${workspaceId}/share-options`, { params: { search: "alice", first: 0, max: 20 }, signal: controller.signal });
  });
});
