import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { RemovableEdge } from "../features/dependency-graph/components/RemovableEdge";
vi.mock("@xyflow/react", () => ({ BaseEdge: () => null, EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => children, getSmoothStepPath: () => ["", 0, 0], useReactFlow: () => ({ setEdges: vi.fn() }) }));
const props: Record<string, unknown> = { id: "e1", source: "a", target: "b", sourceX: 0, sourceY: 0, targetX: 10, targetY: 10, sourcePosition: "right", targetPosition: "left", markerEnd: undefined, style: {} };
describe("RemovableEdge capabilities", () => { it("does not expose direct removal in read-only mode", () => { render(<RemovableEdge {...props as ComponentProps<typeof RemovableEdge>} data={{ readOnly: true }} />); expect(screen.queryByTitle("Remove Connection")).not.toBeInTheDocument(); }); });
