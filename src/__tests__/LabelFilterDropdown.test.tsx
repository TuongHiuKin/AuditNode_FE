import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LabelFilterDropdown } from "../app/components/LabelFilterDropdown";

describe("LabelFilterDropdown", () => {
  const availableLabels = [
    { key: "PROJECT", value: "COREBANKING" },
    { key: "TEAM", value: "BACKEND" },
  ];

  it("renders correctly with default state", () => {
    render(<LabelFilterDropdown availableLabels={availableLabels} selectedKeys={[]} onChange={vi.fn()} />);
    expect(screen.getByText("Labels")).toBeDefined();
  });

  it("toggles dropdown visibility", async () => {
    render(<LabelFilterDropdown availableLabels={availableLabels} selectedKeys={[]} onChange={vi.fn()} />);
    
    const button = screen.getByText("Labels").closest("button");
    if (button) fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText("Filter by Labels")).toBeDefined();
      expect(screen.getByText("PROJECT")).toBeDefined();
      expect(screen.getByText("TEAM")).toBeDefined();
    });

    if (button) fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.queryByText("Filter by Labels")).toBeNull();
    });
  });

  it("calls onChange when a label is selected", async () => {
    const onChangeMock = vi.fn();
    render(<LabelFilterDropdown availableLabels={availableLabels} selectedKeys={[]} onChange={onChangeMock} />);
    
    const button = screen.getByText("Labels").closest("button");
    if (button) fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText("PROJECT")).toBeDefined();
    });

    const projectOption = screen.getByText("PROJECT").closest("button");
    if (projectOption) fireEvent.click(projectOption);

    expect(onChangeMock).toHaveBeenCalledWith(["PROJECT"]);
  });

  it("calls onChange to unselect a label if it is already selected", async () => {
    const onChangeMock = vi.fn();
    render(<LabelFilterDropdown availableLabels={availableLabels} selectedKeys={["TEAM"]} onChange={onChangeMock} />);
    
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
    render(<LabelFilterDropdown availableLabels={availableLabels} selectedKeys={["PROJECT", "TEAM"]} onChange={vi.fn()} />);
    expect(screen.getByText("2")).toBeDefined();
  });
});
