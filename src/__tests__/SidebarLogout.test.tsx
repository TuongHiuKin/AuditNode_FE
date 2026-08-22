import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "../app/components/Sidebar";

const logout = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("../shared/auth/AuthContext", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: { id: "id", username: "Test User", roles: ["Admin"] },
    roles: ["Admin"],
    logout,
  }),
}));

describe("Sidebar logout", () => {
  it("calls the backend-gateway logout action and navigates to AuditNode Login", async () => {
    render(
      <MemoryRouter initialEntries={["/inventory"]}>
        <Routes>
          <Route path="/inventory" element={<Sidebar />} />
          <Route path="/login" element={<div>Login destination</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByText("Test User"));
    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Login destination")).toBeInTheDocument();
  });
});
