import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminUsers } from "../app/pages/AdminUsers";
const mutateAsync = vi.fn().mockResolvedValue(undefined);
vi.mock("../features/admin-users/api/useAdminUsers", () => ({ useAdminUsers: () => ({ users: { data: [{ id: "u1", username: "alice", email: "a@x.test", enabled: true, workspaceCount: 1, isSystemAdmin: true }], isPending: false, isError: false }, status: { isPending: false, mutate: vi.fn() }, create: { isPending: false, mutateAsync: vi.fn() }, role: { isPending: false, mutateAsync }, size: 25 }) }));
describe("AdminUsers system role controls", () => { it("shows current role and confirms revoke", async () => { vi.spyOn(window, "confirm").mockReturnValue(true); render(<AdminUsers />); fireEvent.click(screen.getByRole("button", { name: "Revoke SystemAdmin" })); await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ id: "u1", systemAdmin: false })); }); });
