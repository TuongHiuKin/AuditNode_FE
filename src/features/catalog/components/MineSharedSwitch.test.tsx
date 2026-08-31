import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CatalogAccessProvider } from "../../../shared/catalog/CatalogAccessContext";
import { MineSharedSwitch } from "./MineSharedSwitch";

describe("MineSharedSwitch", () => {
  it("exposes an accessible Mine/Shared selection", () => {
    render(<CatalogAccessProvider><MineSharedSwitch /></CatalogAccessProvider>);

    expect(screen.getByRole("button", { name: "My catalog" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Shared with me" }));
    expect(screen.getByRole("button", { name: "Shared with me" })).toHaveAttribute("aria-pressed", "true");
  });
});
