import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InventoryLayout } from "../app/pages/InventoryLayout";
vi.mock("../shared/workspace/useWorkspaceCapabilities", () => ({ useWorkspaceCapabilities: () => ({ canWriteInventory: true, canImport: true }) }));

vi.mock("../app/hooks/useHeader", () => ({
  useHeader: () => ({
    setHeader: vi.fn(),
  }),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe("InventoryLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders navigation tabs correctly", () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        
          <MemoryRouter initialEntries={["/inventory/servers"]}>
            <InventoryLayout />
          </MemoryRouter>
        
      </QueryClientProvider>
    );

    expect(screen.getByText("Servers")).toBeDefined();
    expect(screen.getByText("Applications")).toBeDefined();
  });

  it("opens the lazily loaded bulk import modal when clicking bulk import button", async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        
          <MemoryRouter initialEntries={["/inventory/servers"]}>
            <InventoryLayout />
          </MemoryRouter>
        
      </QueryClientProvider>
    );

    const bulkImportBtn = screen.getByText("Import");
    fireEvent.click(bulkImportBtn);

    expect(await screen.findByText("Iterative Bulk Import", {}, { timeout: 5000 })).toBeDefined();
  });

  it("toggles export view dropdown", () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        
          <MemoryRouter initialEntries={["/inventory/servers"]}>
            <InventoryLayout />
          </MemoryRouter>
        
      </QueryClientProvider>
    );

    const exportBtn = screen.getByText("Export");
    fireEvent.click(exportBtn);

    expect(screen.getByText("Selective Excel Export (.xlsx)")).toBeDefined();
    expect(screen.getByText("Selective Raw Data (.csv)")).toBeDefined();

    // Click outside or click again to close (clicking again here)
    fireEvent.click(exportBtn);
    expect(screen.queryByText("Selective Excel Export (.xlsx)")).toBeNull();
  });
});


