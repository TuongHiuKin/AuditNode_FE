import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "../shared/api/client";
import { TopologyLabelPicker } from "../features/dependency-graph/components/TopologyLabelPicker";

vi.mock("../shared/api/client", () => ({
  default: { get: vi.fn() },
}));

describe("TopologyLabelPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("selects labels by stable ID and returns their full metadata", async () => {
    const platformLabel = {
      id: "label-platform",
      key: "team",
      value: "platform",
      colorHex: "#ff4d7e",
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: [platformLabel] });
    const onChange = vi.fn();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TopologyLabelPicker selectedLabels={[]} onChange={onChange} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /labels/i }));
    await waitFor(() => expect(screen.getByText("platform")).toBeDefined());
    fireEvent.click(screen.getByRole("option", { name: /team.*platform/i }));

    expect(onChange).toHaveBeenCalledWith([platformLabel]);
  });
});
