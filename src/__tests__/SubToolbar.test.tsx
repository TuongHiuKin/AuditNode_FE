import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubToolbar } from "../features/dependency-graph/components/SubToolbar";

describe("SubToolbar UI Action Gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enables Auto-Map and Sync buttons when canEditInventory is true", () => {
    const onAutoMap = vi.fn();
    const onSync = vi.fn();
    render(<SubToolbar onAutoMap={onAutoMap} onSync={onSync} canEditGraph canAddNodes />);

    const autoMapBtn = screen.getByText("Auto-Map from DB").closest("button");
    const syncBtn = screen.getByText("Save Network State").closest("button");

    expect(autoMapBtn?.disabled).toBe(false);
    expect(syncBtn?.disabled).toBe(false);

    fireEvent.click(autoMapBtn!);
    expect(onAutoMap).toHaveBeenCalledTimes(1);
  });

  it("disables Auto-Map and Sync buttons with tooltip when user is Viewer (canEditInventory: false)", () => {
    const onAutoMap = vi.fn();
    const onSync = vi.fn();
    render(<SubToolbar onAutoMap={onAutoMap} onSync={onSync} canEditGraph={false} canAddNodes={false} />);

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
