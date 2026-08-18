import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "../app/components/ProtectedRoute";

const auth = vi.hoisted(() => ({ status: "initializing" as "initializing" | "authenticated" | "anonymous" }));

vi.mock("../shared/auth/AuthContext", () => ({
  useAuth: () => ({ ...auth, roles: [], user: null }),
}));

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={["/private"]}>
      <Routes>
        <Route path="/login" element={<div>Login destination</div>} />
        <Route path="/private" element={<ProtectedRoute><div>Private content</div></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute authentication state", () => {
  it("waits while session bootstrap is initializing", () => {
    auth.status = "initializing";
    renderRoute();
    expect(screen.getByRole("status")).toHaveTextContent(/restoring session/i);
    expect(screen.queryByText("Login destination")).not.toBeInTheDocument();
  });

  it("redirects anonymous users to the AuditNode login page", () => {
    auth.status = "anonymous";
    renderRoute();
    expect(screen.getByText("Login destination")).toBeInTheDocument();
  });

  it("renders protected content for authenticated users", () => {
    auth.status = "authenticated";
    renderRoute();
    expect(screen.getByText("Private content")).toBeInTheDocument();
  });
});
