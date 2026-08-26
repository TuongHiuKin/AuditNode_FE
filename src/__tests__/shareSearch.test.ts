import { describe, expect, it } from "vitest";
import { canSearchShareDirectory, effectiveShareOptionsSearch, normalizeShareDirectorySearch } from "../features/workspace-sharing/lib/shareSearch";

describe("workspace share directory search privacy", () => {
  it("does not expose a directory query for empty or short input", () => {
    expect(effectiveShareOptionsSearch("")).toBe("");
    expect(effectiveShareOptionsSearch(" ab ")).toBe("");
    expect(canSearchShareDirectory("ab")).toBe(false);
  });

  it("normalizes valid input and caps its size", () => {
    expect(effectiveShareOptionsSearch("  Alice  ")).toBe("Alice");
    expect(canSearchShareDirectory("Alice")).toBe(true);
    expect(normalizeShareDirectorySearch("x".repeat(120))).toHaveLength(100);
  });
});
