import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LabelFilterDropdown } from "../app/components/LabelFilterDropdown";
import apiClient from "../shared/api/client";
import { setSelectedWorkspaceId } from "../shared/workspace/workspaceStore";

vi.mock("../shared/api/client", () => ({
  default: {
    get: vi.fn(),
  },
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
  },
});

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

  const renderWithClient = (ui: React.ReactElement, client = createTestQueryClient()) => {
    return {
      ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>),
      client,
    };
  };

  it("renders correctly with default state", () => {
    renderWithClient(<LabelFilterDropdown selectedKeys={[]} onChange={vi.fn()} />);
    expect(screen.getByText("Labels")).toBeDefined();
  });

  it("toggles dropdown visibility", async () => {
    renderWithClient(<LabelFilterDropdown selectedKeys={[]} onChange={vi.fn()} />);
    
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
    renderWithClient(<LabelFilterDropdown selectedKeys={[]} onChange={onChangeMock} />);
    
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
    renderWithClient(<LabelFilterDropdown selectedKeys={["BACKEND"]} onChange={onChangeMock} />);
    
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
    renderWithClient(<LabelFilterDropdown selectedKeys={["COREBANKING", "BACKEND"]} onChange={vi.fn()} />);
    expect(screen.getByText("2")).toBeDefined();
  });

  it("clears labels and re-fetches when switching workspaces", async () => {
    let resolveB!: (value: { data: typeof availableLabels }) => void;
    const requestB = new Promise<{ data: typeof availableLabels }>((resolve) => { resolveB = resolve; });
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: availableLabels })
      .mockReturnValueOnce(requestB);

    const onChange = vi.fn();
    renderWithClient(<LabelFilterDropdown selectedKeys={["OLD"]} onChange={onChange} />);
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));

    act(() => { setSelectedWorkspaceId(workspaceB, { persist: false }); });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
    expect(onChange).toHaveBeenCalledWith([]);

    act(() => { resolveB({ data: [{ key: "TEAM", value: "WORKSPACE_B" }] }); });

    fireEvent.click(screen.getByText("Labels").closest("button")!);
    await waitFor(() => expect(screen.getByText("WORKSPACE_B")).toBeDefined());
  });
});
