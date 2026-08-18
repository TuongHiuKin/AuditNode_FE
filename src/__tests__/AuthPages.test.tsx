import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "../app/pages/LoginPage";
import { RegisterPage } from "../app/pages/RegisterPage";

const auth = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock("../shared/auth/AuthContext", () => ({
  useAuth: () => auth,
}));

describe("AuditNode authentication pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("logs in through the backend context without writing browser token storage", async () => {
    auth.login.mockResolvedValue(undefined);
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Authenticated home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText("Username"), "auditor");
    await userEvent.type(screen.getByLabelText("Password"), "password");
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(auth.login).toHaveBeenCalledWith("auditor", "password"));
    expect(await screen.findByText("Authenticated home")).toBeInTheDocument();
    expect(localStorage.getItem("accessToken")).toBeNull();
  });

  it("shows a distinct safe message for duplicate registration", async () => {
    auth.register.mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText("Username"), "existing");
    await userEvent.type(screen.getByLabelText("Email Address"), "existing@example.test");
    await userEvent.type(screen.getByLabelText("Password"), "password");
    await userEvent.type(screen.getByLabelText("Confirm Password"), "password");
    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
  });
});
