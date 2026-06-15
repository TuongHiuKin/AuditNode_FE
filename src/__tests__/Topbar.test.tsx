import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Topbar } from "../app/components/Topbar";
import * as keycloakService from "../services/keycloakService";

vi.mock("../services/keycloakService", () => ({
  getUsername: vi.fn(),
  doLogout: vi.fn(),
}));

vi.mock("../app/hooks/useHeader", () => ({
  useHeader: () => ({
    title: "Test Title",
    subtitle: "Test Subtitle",
    icon: <span>Icon</span>,
  }),
}));

describe("Topbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders user information correctly", () => {
    vi.mocked(keycloakService.getUsername).mockReturnValue("testuser");
    render(<Topbar />);
    expect(screen.getAllByText("testuser")).toBeDefined();
    expect(screen.getAllByText("Authenticated User")).toBeDefined();
  });

  it("toggles dropdown when user profile is clicked", () => {
    vi.mocked(keycloakService.getUsername).mockReturnValue("testuser");
    render(<Topbar />);
    
    // Dropdown should be closed initially
    expect(screen.queryByText("Logout")).toBeNull();

    const profileBtn = screen.getByRole("button");
    fireEvent.click(profileBtn);

    // Dropdown should be open
    expect(screen.getByText("Logout")).toBeDefined();
    
    fireEvent.click(profileBtn);
    // Dropdown should be closed again
    expect(screen.queryByText("Logout")).toBeNull();
  });

  it("calls doLogout when logout button is clicked", () => {
    vi.mocked(keycloakService.getUsername).mockReturnValue("testuser");
    render(<Topbar />);
    
    const profileBtn = screen.getByRole("button");
    fireEvent.click(profileBtn);

    const logoutBtn = screen.getByText("Logout");
    fireEvent.click(logoutBtn);

    expect(keycloakService.doLogout).toHaveBeenCalled();
  });
});
