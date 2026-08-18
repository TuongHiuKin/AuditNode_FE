import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LabelFilterDropdown } from "../app/components/LabelFilterDropdown";
import apiClient from "../shared/api/client";
import { setSelectedWorkspaceId } from "../shared/workspace/workspaceStore";

vi.mock("../shared/api/client", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("LabelFilterDropdown", () => {
  const workspaceA = "11111111-1111-4111-8111-111111111111";
  const workspaceB = "22222222-2222-4222-8222-222222222222";
  const availableLabels = [
    { key: "PROJECT", value: "COREBANKING" },
    { key: "TEAM", value: "BACKEND" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    setSelectedWorkspaceId(workspaceA, { persist: false });
    vi.mocked(apiClient.get).mockResolvedValue({ data: availableLabels });
  });

  it("renders correctly with default state", () => {
    render(<LabelFilterDropdown selectedKeys={[]} onChange={vi.fn()} />);
    expect(screen.getByText("Labels")).toBeDefined();
  });

  it("toggles dropdown visibility", async () => {
    render(<LabelFilterDropdown selectedKeys={[]} onChange={vi.fn()} />);
    
    const button = screen.getByText("Labels").closest("button");
    if (button) fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search labels...")).toBeDefined();
      expect(screen.getByText("PROJECT")).toBeDefined();
      expect(screen.getByText("TEAM")).toBeDefined();
    });

    if (button) fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Search labels...")).toBeNull();
    });
  });

  it("calls onChange when a label is selected", async () => {
    const onChangeMock = vi.fn();
    render(<LabelFilterDropdown selectedKeys={[]} onChange={onChangeMock} />);
    
    const button = screen.getByText("Labels").closest("button");
    if (button) fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText("PROJECT")).toBeDefined();
    });

    const projectOption = screen.getByText("PROJECT").closest("button");
    if (projectOption) fireEvent.click(projectOption);

    expect(onChangeMock).toHaveBeenCalledWith(["COREBANKING"]);
  });

  it("calls onChange to unselect a label if it is already selected", async () => {
    const onChangeMock = vi.fn();
    render(<LabelFilterDropdown selectedKeys={["BACKEND"]} onChange={onChangeMock} />);
    
    const button = screen.getByText("Labels").closest("button");
    if (button) fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText("TEAM")).toBeDefined();
    });

    const teamOption = screen.getByText("TEAM").closest("button");
    if (teamOption) fireEvent.click(teamOption);

    expect(onChangeMock).toHaveBeenCalledWith([]);
  });

  it("displays the correct selected count badge", () => {
    render(<LabelFilterDropdown selectedKeys={["COREBANKING", "BACKEND"]} onChange={vi.fn()} />);
    expect(screen.getByText("2")).toBeDefined();
  });

  it("clears labels and ignores a late response from the previous workspace", async () => {
    let resolveA!: (value: { data: typeof availableLabels }) => void;
    let resolveB!: (value: { data: typeof availableLabels }) => void;
    const requestA = new Promise<{ data: typeof availableLabels }>((resolve) => { resolveA = resolve; });
    const requestB = new Promise<{ data: typeof availableLabels }>((resolve) => { resolveB = resolve; });
    vi.mocked(apiClient.get)
      .mockReturnValueOnce(requestA)
      .mockReturnValueOnce(requestB);
    const onChange = vi.fn();
    render(<LabelFilterDropdown selectedKeys={["OLD"]} onChange={onChange} />);
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));

    act(() => { setSelectedWorkspaceId(workspaceB, { persist: false }); });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
    expect(onChange).toHaveBeenCalledWith([]);
    act(() => { resolveB({ data: [{ key: "TEAM", value: "WORKSPACE_B" }] }); });
    await waitFor(() => expect(vi.mocked(apiClient.get).mock.calls[1][1]?.signal).toBeInstanceOf(AbortSignal));
    act(() => { resolveA({ data: [{ key: "TEAM", value: "WORKSPACE_A" }] }); });

    fireEvent.click(screen.getByText("Labels").closest("button")!);
    await waitFor(() => expect(screen.getByText("WORKSPACE_B")).toBeDefined());
    expect(screen.queryByText("WORKSPACE_A")).toBeNull();
  });
});
