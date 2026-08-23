import { describe, expect, it, vi } from "vitest";
import apiClient from "../shared/api/client";
import { adminUsersApi } from "../features/admin-users/api/adminUsers";
vi.mock("../shared/api/client", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
describe("adminUsersApi", () => {
  it("lists users with server pagination and without a workspace header", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] }); await adminUsersApi.list("alice", 25, 25);
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/admin/users", { params: { search: "alice", first: 25, max: 25 }, skipWorkspaceHeader: true });
  });
  it("updates identity status", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({}); await adminUsersApi.setStatus("user/1", false);
    expect(apiClient.put).toHaveBeenCalledWith("/api/v1/admin/users/user%2F1/status", { enabled: false }, { skipWorkspaceHeader: true });
  });
  it("creates users and updates the SystemAdmin role using actual endpoints", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({}); vi.mocked(apiClient.put).mockResolvedValue({});
    await adminUsersApi.create({ username: "alice", email: "a@example.com", password: "password1" });
    await adminUsersApi.setSystemAdmin("user/1", true);
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/admin/users", expect.objectContaining({ username: "alice" }), { skipWorkspaceHeader: true });
    expect(apiClient.put).toHaveBeenCalledWith("/api/v1/admin/users/user%2F1/roles", { systemAdmin: true }, { skipWorkspaceHeader: true });
  });
});
