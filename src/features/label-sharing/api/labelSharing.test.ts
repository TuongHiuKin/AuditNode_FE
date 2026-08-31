import { describe, expect, it, vi } from "vitest";
import apiClient from "../../../shared/api/client";
import { createAnonymousViewerLink, createUserGrant, listAnonymousViewerLinks } from "./labelSharing";

describe("label sharing API", () => {
  it("allows an existing system user to be selected as Viewer or Editor", async () => {
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({ data: { id: "grant-1" } });
    await createUserGrant("label-1", { granteeUserId: "user-2", permission: "editor", expiresAt: null });
    expect(post).toHaveBeenCalledWith(
      "/api/v1/labels/label-1/grants",
      expect.objectContaining({ granteeUserId: "user-2", permission: "editor" }),
      expect.objectContaining({ skipWorkspaceHeader: true }),
    );
  });

  it("creates anonymous links as Viewer links without an editor/claim field", async () => {
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({ data: { token: "secret" } });
    await createAnonymousViewerLink("label-1", "2030-01-01T00:00:00.000Z");
    expect(post).toHaveBeenCalledWith(
      "/api/v1/labels/label-1/share-links",
      { expiresAt: "2030-01-01T00:00:00.000Z" },
      expect.objectContaining({ skipWorkspaceHeader: true }),
    );
  });

  it("lists revocable link metadata without requesting a raw token", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: [] });
    await listAnonymousViewerLinks("label-1");
    expect(get).toHaveBeenCalledWith(
      "/api/v1/labels/label-1/share-links",
      expect.objectContaining({ skipWorkspaceHeader: true }),
    );
  });
});
