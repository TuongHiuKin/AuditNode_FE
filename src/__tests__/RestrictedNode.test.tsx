import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RestrictedNode } from "../features/dependency-graph/components/RestrictedNode";
describe("RestrictedNode", () => { it("renders only the safe backend label", () => { render(<RestrictedNode data={{ label: "External Resource (Restricted)" }} />); expect(screen.getByLabelText("Restricted external resource")).toHaveTextContent("External Resource (Restricted)"); }); });
