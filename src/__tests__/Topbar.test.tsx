import { render, screen, fireEvent } from "@testing-library/react";
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
    title: "Test Title",
    subtitle: "Test Subtitle",
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

  it("renders user information correctly", () => {
    vi.mocked(keycloakService.getUsername).mockReturnValue("testuser");
    renderWithProviders(<Topbar />);
    expect(screen.getAllByText("testuser")).toBeDefined();
    expect(screen.getAllByText("Authenticated User")).toBeDefined();
  });

  it("toggles dropdown when user profile is clicked", () => {
    vi.mocked(keycloakService.getUsername).mockReturnValue("testuser");
    renderWithProviders(<Topbar />);

    // User profile button is the second button (first is workspace)
    const profileBtn = screen.getAllByRole("button")[1];
    fireEvent.click(profileBtn);

    expect(screen.getByText("Logout")).toBeDefined();
  });

  it("renders workspace switcher", () => {
    renderWithProviders(<Topbar />);
    expect(screen.getByText("Active Workspace")).toBeDefined();
  });
});

