import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InventoryLayout } from "../app/pages/InventoryLayout";
import { WorkspaceProvider } from "../app/hooks/useWorkspaceStore";

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
    localStorage.setItem('auditNode_activeWorkspace', JSON.stringify({ id: 'ws-1', name: 'Test Workspace' }));
  });

  it("renders navigation tabs correctly", () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <WorkspaceProvider>
          <MemoryRouter initialEntries={["/inventory/servers"]}>
            <InventoryLayout />
          </MemoryRouter>
        </WorkspaceProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText("Servers")).toBeDefined();
    expect(screen.getByText("Applications")).toBeDefined();
  });

  it("opens bulk import modal when clicking bulk import button", () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <WorkspaceProvider>
          <MemoryRouter initialEntries={["/inventory/servers"]}>
            <InventoryLayout />
          </MemoryRouter>
        </WorkspaceProvider>
      </QueryClientProvider>
    );

    const bulkImportBtn = screen.getByText("Bulk Import");
    fireEvent.click(bulkImportBtn);

    expect(screen.getByText("Iterative Bulk Import")).toBeDefined();
  });

  it("toggles export view dropdown", () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <WorkspaceProvider>
          <MemoryRouter initialEntries={["/inventory/servers"]}>
            <InventoryLayout />
          </MemoryRouter>
        </WorkspaceProvider>
      </QueryClientProvider>
    );

    const exportBtn = screen.getByText("Export View");
    fireEvent.click(exportBtn);

    expect(screen.getByText("Selective Excel Export (.xlsx)")).toBeDefined();
    expect(screen.getByText("Selective Raw Data (.csv)")).toBeDefined();

    // Click outside or click again to close (clicking again here)
    fireEvent.click(exportBtn);
    expect(screen.queryByText("Selective Excel Export (.xlsx)")).toBeNull();
  });
});
