import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FilterBar } from "../features/dependency-graph/components/FilterBar";
import { SubToolbar } from "../features/dependency-graph/components/SubToolbar";

describe("Toolbars", () => {
  describe("FilterBar", () => {
    const mockProps = {
      selectedEnv: "All",
      setSelectedEnv: vi.fn(),
      selectedDatacenter: "All",
      setSelectedDatacenter: vi.fn(),
    };

    it("triggers setSelectedEnv on change", () => {
      render(<FilterBar {...mockProps} />);
      // Open dropdown
      fireEvent.click(screen.getByText("Environment"));
      // Select option
      fireEvent.click(screen.getByText("Production"));
      expect(mockProps.setSelectedEnv).toHaveBeenCalledWith("Production");
    });

    it("triggers setSelectedDatacenter on change", () => {
      render(<FilterBar {...mockProps} />);
      // Open dropdown
      fireEvent.click(screen.getByText("Datacenter"));
      // Select option
      fireEvent.click(screen.getByText("AWS Cloud"));
      expect(mockProps.setSelectedDatacenter).toHaveBeenCalledWith("AWS");
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
