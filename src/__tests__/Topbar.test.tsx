import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Topbar } from "../app/components/Topbar";
import * as keycloakService from "../services/keycloakService";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkspaceProvider } from "../app/hooks/useWorkspaceStore";
import apiClient from "../shared/api/client";

vi.mock("../../services/keycloakService", () => ({
  getUsername: vi.fn(),
  doLogout: vi.fn(),
}));

vi.mock("../shared/api/client", () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock("../app/hooks/useHeader", () => ({
  useHeader: () => ({
    breadcrumbs: ["Test Title", "Test Subtitle"],
    icon: <span>Icon</span>,
  }),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe("Topbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <WorkspaceProvider>
          {ui}
        </WorkspaceProvider>
      </QueryClientProvider>
    );
  };

  it("renders breadcrumbs correctly", () => {
    renderWithProviders(<Topbar />);
    expect(screen.getByText("Test Title")).toBeDefined();
    expect(screen.getByText("Test Subtitle")).toBeDefined();
  });

  it("renders workspace switcher and toggles dropdown", async () => {
    renderWithProviders(<Topbar />);
    
    await waitFor(() => {
      expect(screen.getByText("Default Workspace")).toBeDefined();
    });
    
    const workspaceBtn = screen.getByText("Default Workspace").closest("button");
    if (workspaceBtn) fireEvent.click(workspaceBtn);

    expect(screen.getByText("Switch Workspace")).toBeDefined();
  });
});

