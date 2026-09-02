import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogLabel } from "../../../shared/catalog/types";
import type { LabelGrant, ShareLinkMetadata } from "../api/labelSharing";
import { ShareLabelModal } from "./ShareLabelModal";

const hookMocks = vi.hoisted(() => ({
  createGrant: { mutateAsync: vi.fn(), isPending: false },
  updateGrant: { mutateAsync: vi.fn(), isPending: false },
  revokeGrant: { mutateAsync: vi.fn(), isPending: false },
  createLink: { mutateAsync: vi.fn(), isPending: false },
  revokeLink: { mutateAsync: vi.fn(), isPending: false },
  grants: [] as LabelGrant[],
  links: [] as ShareLinkMetadata[],
}));

vi.mock("../api/useLabelSharing", () => ({
  useLabelGrants: () => ({ data: hookMocks.grants }),
  useShareOptions: () => ({
    data: {
      users: [{ id: "user-2", username: "reviewer", email: "reviewer@example.test" }],
      sharesAllOwnerResources: false,
    },
  }),
  useShareLinks: () => ({ data: hookMocks.links }),
  useLabelSharingMutations: () => ({
    createGrant: hookMocks.createGrant,
    updateGrant: hookMocks.updateGrant,
    revokeGrant: hookMocks.revokeGrant,
    createLink: hookMocks.createLink,
    revokeLink: hookMocks.revokeLink,
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

const access = {
  ownerUserId: "owner-1",
  effectivePermission: "owner" as const,
  sharedLabelIds: [],
  capabilities: {
    canRead: true,
    canEditProperties: true,
    canCreate: true,
    canDelete: true,
    canChangeLabels: true,
    canChangeOwner: true,
    canManageGrants: true,
  },
};

const ownerLabel: CatalogLabel = {
  ...access,
  id: "owner-label",
  key: "OWNER",
  value: "owner-1",
  kind: "owner",
  isProtected: true,
};

const businessLabel: CatalogLabel = {
  ...access,
  id: "business-label",
  key: "TEAM",
  value: "payments",
  kind: "business",
  isProtected: false,
};

function renderModal(labels: CatalogLabel[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ShareLabelModal open onOpenChange={vi.fn()} labels={labels} />
    </QueryClientProvider>,
  );
}

describe("ShareLabelModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookMocks.grants = [];
    hookMocks.links = [];
    hookMocks.createGrant.mutateAsync.mockResolvedValue(undefined);
    hookMocks.updateGrant.mutateAsync.mockResolvedValue(undefined);
    hookMocks.revokeGrant.mutateAsync.mockResolvedValue(undefined);
    hookMocks.createLink.mutateAsync.mockResolvedValue({
      grantId: "link-1",
      token: "one-time-secret",
      expiresAt: "2030-01-01T00:00:00.000Z",
      version: 1,
      sharesAllOwnerResources: false,
    });
    hookMocks.revokeLink.mutateAsync.mockResolvedValue(undefined);
    sessionStorage.clear();
  });

  it("requires explicit confirmation before an Owner label can be granted or linked", async () => {
    const user = userEvent.setup();
    renderModal([ownerLabel]);

    expect(await screen.findByRole("alert")).toHaveTextContent("every current and future resource owned by you");
    await user.selectOptions(screen.getByLabelText("Grant user"), "user-2");

    const grantButton = screen.getByRole("button", { name: "Grant" });
    const createLinkButton = screen.getByRole("button", { name: "Create Viewer link" });
    expect(grantButton).toBeDisabled();
    expect(createLinkButton).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "I understand the full-catalog scope" }));
    expect(grantButton).toBeEnabled();
    expect(createLinkButton).toBeEnabled();

    await user.click(grantButton);
    expect(hookMocks.createGrant.mutateAsync).toHaveBeenCalledWith({
      granteeUserId: "user-2",
      permission: "viewer",
      expiresAt: null,
    });
  });

  it("updates Viewer and Editor grants and revokes the selected grant versions", async () => {
    const viewerGrant: LabelGrant = {
      id: "grant-viewer",
      labelId: businessLabel.id,
      granteeUserId: "viewer-1",
      permission: "viewer",
      expiresAt: null,
      revokedAt: null,
      version: 3,
    };
    const editorGrant: LabelGrant = {
      ...viewerGrant,
      id: "grant-editor",
      granteeUserId: "editor-1",
      permission: "editor",
      version: 7,
    };
    hookMocks.grants = [viewerGrant, editorGrant];
    const user = userEvent.setup();
    renderModal([businessLabel]);

    await user.click(await screen.findByRole("button", { name: "Make Editor" }));
    expect(hookMocks.updateGrant.mutateAsync).toHaveBeenCalledWith({ ...viewerGrant, permission: "editor" });

    await user.click(screen.getByRole("button", { name: "Make Viewer" }));
    expect(hookMocks.updateGrant.mutateAsync).toHaveBeenCalledWith({ ...editorGrant, permission: "viewer" });

    const viewerRow = screen.getByText(/viewer-1/).closest("div");
    const editorRow = screen.getByText(/editor-1/).closest("div");
    expect(viewerRow).not.toBeNull();
    expect(editorRow).not.toBeNull();
    await user.click(within(viewerRow!).getByRole("button", { name: "Revoke" }));
    await user.click(within(editorRow!).getByRole("button", { name: "Revoke" }));
    expect(hookMocks.revokeGrant.mutateAsync).toHaveBeenNthCalledWith(1, viewerGrant);
    expect(hookMocks.revokeGrant.mutateAsync).toHaveBeenNthCalledWith(2, editorGrant);
  });

  it("stores a newly issued one-time Viewer token only in the active session entry", async () => {
    const user = userEvent.setup();
    renderModal([businessLabel]);

    await user.click(await screen.findByRole("button", { name: "Create Viewer link" }));

    expect(hookMocks.createLink.mutateAsync).toHaveBeenCalledTimes(1);
    const expiresAt = hookMocks.createLink.mutateAsync.mock.calls[0][0] as string;
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
    await waitFor(() => expect(screen.getByLabelText("Public share link")).toHaveValue(
      `${window.location.origin}/shared#token=one-time-secret`,
    ));
    expect(JSON.parse(sessionStorage.getItem("auditnode.activeViewerLink")!)).toEqual({
      grantId: "link-1",
      token: "one-time-secret",
      expiresAt: "2030-01-01T00:00:00.000Z",
      version: 1,
      sharesAllOwnerResources: false,
      labelId: businessLabel.id,
      url: `${window.location.origin}/shared#token=one-time-secret`,
    });
    expect(localStorage.getItem("auditnode.activeViewerLink")).toBeNull();
  });

  it("revokes an anonymous link and removes its raw token from session storage", async () => {
    const link: ShareLinkMetadata = {
      grantId: "link-1",
      labelId: businessLabel.id,
      expiresAt: "2030-01-01T00:00:00.000Z",
      revokedAt: null,
      version: 4,
      sharesAllOwnerResources: false,
    };
    hookMocks.links = [link];
    sessionStorage.setItem("auditnode.activeViewerLink", JSON.stringify({
      ...link,
      token: "one-time-secret",
      url: "http://localhost/shared#token=one-time-secret",
    }));
    const user = userEvent.setup();
    renderModal([businessLabel]);

    expect(await screen.findByLabelText("Public share link")).toHaveValue("http://localhost/shared#token=one-time-secret");
    await user.click(screen.getByRole("button", { name: "Revoke" }));

    expect(hookMocks.revokeLink.mutateAsync).toHaveBeenCalledWith(link);
    await waitFor(() => expect(sessionStorage.getItem("auditnode.activeViewerLink")).toBeNull());
    expect(screen.getByRole("button", { name: "Create Viewer link" })).toBeInTheDocument();
  });
});
