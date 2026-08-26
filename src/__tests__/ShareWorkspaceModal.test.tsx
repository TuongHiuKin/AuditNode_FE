import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareWorkspaceModal } from "../features/workspace-sharing/components/ShareWorkspaceModal";

const useWorkspaceShares = vi.hoisted(() => vi.fn());

vi.mock("../shared/workspace/WorkspaceContext", () => ({
  useWorkspace: () => ({ selectedWorkspaceId: "workspace-1" }),
}));
vi.mock("../features/workspace-sharing/api/useWorkspaceShares", () => ({ useWorkspaceShares }));

describe("ShareWorkspaceModal directory privacy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useWorkspaceShares.mockReturnValue({
      shares: { data: [] },
      options: { data: { users: [], labels: [], frames: [] }, isFetching: false, isError: false },
      grant: { mutateAsync: vi.fn(), isPending: false },
      update: { mutateAsync: vi.fn(), isPending: false },
      revoke: { mutateAsync: vi.fn() },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("debounces valid searches and never sends a short directory term", async () => {
    render(<ShareWorkspaceModal open onOpenChange={vi.fn()} />);
    const input = screen.getByLabelText("Find user");

    fireEvent.change(input, { target: { value: "ab" } });
    await act(async () => vi.advanceTimersByTime(350));
    expect(useWorkspaceShares).not.toHaveBeenCalledWith("workspace-1", true, "ab");
    expect(screen.getByRole("status")).toHaveTextContent("Enter at least 3 characters");

    fireEvent.change(input, { target: { value: "alice" } });
    await act(async () => vi.advanceTimersByTime(349));
    expect(useWorkspaceShares).not.toHaveBeenCalledWith("workspace-1", true, "alice");

    await act(async () => vi.advanceTimersByTime(1));
    expect(useWorkspaceShares).toHaveBeenLastCalledWith("workspace-1", true, "alice");
  });
});
