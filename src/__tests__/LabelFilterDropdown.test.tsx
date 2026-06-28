import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LabelFilterDropdown } from "../app/components/LabelFilterDropdown";
import apiClient from "../shared/api/client";

vi.mock("../shared/api/client", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("LabelFilterDropdown", () => {
  const availableLabels = [
    { key: "PROJECT", value: "COREBANKING" },
    { key: "TEAM", value: "BACKEND" },
  ];

  beforeEach(() => {
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
});
