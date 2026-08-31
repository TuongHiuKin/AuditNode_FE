import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FilterBar } from "../features/dependency-graph/components/FilterBar";
import { SubToolbar } from "../features/dependency-graph/components/SubToolbar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
vi.mock("../shared/workspace/useWorkspaceCapabilities", () => ({ useWorkspaceCapabilities: () => ({ canEditGraph: true }) }));

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
      onQueryChange: vi.fn(),
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

    it("renders search input with correct placeholder", () => {
      wrap(<FilterBar {...mockProps} />);
      expect(screen.getByPlaceholderText(/search servers & apps/i)).toBeDefined();
    });
  });

  describe("SubToolbar", () => {
    const mockProps = {
      onAutoMap: vi.fn(),
      onSync: vi.fn(),
      isSyncing: false,
      canEditGraph: true,
      canAddNodes: true,
    };

    it("triggers onAutoMap when button clicked", () => {
      render(<SubToolbar {...mockProps} />);
      fireEvent.click(screen.getByText(/Auto-Map from DB/i));
      expect(mockProps.onAutoMap).toHaveBeenCalled();
    });

    it("triggers onSync when button clicked", () => {
      render(<SubToolbar {...mockProps} />);
      fireEvent.click(screen.getByText(/Save Network State/i));
      expect(mockProps.onSync).toHaveBeenCalled();
    });

    it("shows loading state when isSyncing is true", () => {
      render(<SubToolbar {...mockProps} isSyncing={true} />);
      expect(screen.getByText(/Syncing.../i)).toBeDefined();
      expect(screen.getByRole("button", { name: /Syncing.../i })).toBeDisabled();
    });
  });
});
