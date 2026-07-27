import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubToolbar } from "../features/dependency-graph/components/SubToolbar";
import * as useRBACHook from "../shared/auth/useRBAC";

vi.mock("../shared/auth/useRBAC", () => ({
  useRBAC: vi.fn(),
}));

describe("SubToolbar UI Action Gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enables Auto-Map and Sync buttons when canEditInventory is true", () => {
    vi.mocked(useRBACHook.useRBAC).mockReturnValue({
      isAdmin: false,
      isAuditor: true,
      isViewer: false,
      canEditInventory: true,
      canManageSystem: false,
      isReadOnly: false,
      roles: ["Auditor"],
    });

    const onAutoMap = vi.fn();
    const onSync = vi.fn();
    render(<SubToolbar onAutoMap={onAutoMap} onSync={onSync} />);

    const autoMapBtn = screen.getByText("Auto-Map from DB").closest("button");
    const syncBtn = screen.getByText("Save Network State").closest("button");

    expect(autoMapBtn?.disabled).toBe(false);
    expect(syncBtn?.disabled).toBe(false);

    fireEvent.click(autoMapBtn!);
    expect(onAutoMap).toHaveBeenCalledTimes(1);
  });

  it("disables Auto-Map and Sync buttons with tooltip when user is Viewer (canEditInventory: false)", () => {
    vi.mocked(useRBACHook.useRBAC).mockReturnValue({
      isAdmin: false,
      isAuditor: false,
      isViewer: true,
      canEditInventory: false,
      canManageSystem: false,
      isReadOnly: true,
      roles: ["Viewer"],
    });

    const onAutoMap = vi.fn();
    const onSync = vi.fn();
    render(<SubToolbar onAutoMap={onAutoMap} onSync={onSync} />);

    const autoMapBtn = screen.getByText("Auto-Map from DB").closest("button");
    const syncBtn = screen.getByText("Save Network State").closest("button");

    expect(autoMapBtn?.disabled).toBe(true);
    expect(syncBtn?.disabled).toBe(true);
    expect(autoMapBtn?.getAttribute("title")).toBe("Bạn không có quyền thao tác");
    expect(syncBtn?.getAttribute("title")).toBe("Bạn không có quyền thao tác");

    fireEvent.click(autoMapBtn!);
    expect(onAutoMap).not.toHaveBeenCalled();
  });
});
