import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FilterBar } from "../features/dependency-graph/components/FilterBar";
import { SubToolbar } from "../features/dependency-graph/components/SubToolbar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe("Toolbars", () => {
  describe("FilterBar", () => {
    const mockProps = {
      selectedEnv: "Development",
      setSelectedEnv: vi.fn(),
      selectedDatacenter: "All",
      setSelectedDatacenter: vi.fn(),
    };

    const wrap = (ui: React.ReactElement) => render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );

    beforeEach(() => {
      vi.clearAllMocks();
      queryClient.clear();
    });

    it("triggers setSelectedEnv on change", () => {
      wrap(<FilterBar {...mockProps} />);
      // Development is already selected, so it won't show the "Environment" label as displayText
      fireEvent.click(screen.getByText("Development"));
      fireEvent.click(screen.getByText("Production"));
      expect(mockProps.setSelectedEnv).toHaveBeenCalledWith("Production");
    });

    it("triggers setSelectedDatacenter on change", () => {
      wrap(<FilterBar {...mockProps} />);
      // Datacenter label is visible because value is "All"
      fireEvent.click(screen.getByText("Datacenter"));
      fireEvent.click(screen.getByText("All"));
      expect(mockProps.setSelectedDatacenter).toHaveBeenCalledWith("All");
    });
  });

  describe("SubToolbar", () => {
    const mockProps = {
      onAddServer: vi.fn(),
      onAddDatacenter: vi.fn(),
      onAutoMap: vi.fn(),
    };

    it("triggers onAddServer when button clicked", () => {
      render(<SubToolbar {...mockProps} />);
      fireEvent.click(screen.getByText(/Add Server Container/i));
      expect(mockProps.onAddServer).toHaveBeenCalled();
    });

    it("triggers onAddDatacenter when button clicked", () => {
      render(<SubToolbar {...mockProps} />);
      fireEvent.click(screen.getByText(/Add Datacenter Cluster/i));
      expect(mockProps.onAddDatacenter).toHaveBeenCalled();
    });

    it("triggers onAutoMap when button clicked", () => {
      render(<SubToolbar {...mockProps} />);
      fireEvent.click(screen.getByText(/Auto-Map from DB/i));
      expect(mockProps.onAutoMap).toHaveBeenCalled();
    });
  });
});
