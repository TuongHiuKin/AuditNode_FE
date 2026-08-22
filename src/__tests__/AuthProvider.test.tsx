import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "../shared/api/client";
import { AuthProvider, useAuth } from "../shared/auth/AuthContext";
import {
  beginAuthInitialization,
  getAccessToken,
  registerSessionCacheClearer,
} from "../shared/auth/authStore";

vi.mock("../shared/api/client", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="username">{auth.user?.username ?? "none"}</span>
      <button onClick={() => void auth.logout().catch(() => undefined)}>Logout now</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    beginAuthInitialization();
  });

  it("restores an authenticated session through the backend refresh cookie", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { accessToken: "memory-token", expiresIn: 300 } });
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { id: "user-id", username: "auditor", email: "auditor@example.test", roles: ["Auditor"] },
    });

    render(<AuthProvider><Probe /></AuthProvider>);

    expect(screen.getByTestId("status")).toHaveTextContent("initializing");
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("authenticated"));
    expect(screen.getByTestId("username")).toHaveTextContent("auditor");
    expect(getAccessToken()).toBe("memory-token");
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(sessionStorage.getItem("accessToken")).toBeNull();
    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/v1/auth/refresh",
      undefined,
      expect.objectContaining({ withCredentials: true, skipAuthRefresh: true }),
    );
  });

  it("becomes anonymous when bootstrap refresh fails", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error("refresh unavailable"));

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("anonymous"));
    expect(getAccessToken()).toBeNull();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("clears auth, workspace, graph state, and query cache when backend logout fails", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { accessToken: "memory-token", expiresIn: 300 } });
    vi.mocked(apiClient.get).mockResolvedValue({ data: { id: "id", username: "user", roles: [] } });
    const clearCache = vi.fn();
    registerSessionCacheClearer(clearCache);
    localStorage.setItem("workspaceId", "workspace-id");
    sessionStorage.setItem("dependencyGraphState", "cached-graph");
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("authenticated"));
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error("logout unavailable"));

    await userEvent.click(screen.getByRole("button", { name: "Logout now" }));

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("anonymous"));
    expect(localStorage.getItem("workspaceId")).toBeNull();
    expect(sessionStorage.getItem("dependencyGraphState")).toBeNull();
    expect(clearCache).toHaveBeenCalled();
  });
});
