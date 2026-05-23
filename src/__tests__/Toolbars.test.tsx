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
      const envSelect = screen.getByDisplayValue("All Environments");
      fireEvent.change(envSelect, { target: { value: "Production" } });
      expect(mockProps.setSelectedEnv).toHaveBeenCalledWith("Production");
    });

    it("triggers setSelectedDatacenter on change", () => {
      render(<FilterBar {...mockProps} />);
      const dcSelect = screen.getByDisplayValue("All Datacenters");
      fireEvent.change(dcSelect, { target: { value: "AWS" } });
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
