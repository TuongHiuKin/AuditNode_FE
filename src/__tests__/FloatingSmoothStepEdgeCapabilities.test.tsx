import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { FloatingSmoothStepEdge } from "../features/dependency-graph/components/FloatingSmoothStepEdge";
vi.mock("@xyflow/react", () => ({ BaseEdge: () => null, EdgeLabelRenderer: ({ children }: { children: ReactNode }) => children, getStraightPath: () => ["", 0, 0], getSmoothStepPath: () => ["", 0, 0], useInternalNode: () => ({ measured: { width: 10, height: 10 }, internals: { positionAbsolute: { x: 0, y: 0 } } }), useReactFlow: () => ({ setEdges: vi.fn() }), Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" } }));
vi.mock("../features/dependency-graph/utils/floatingEdgeUtils", () => ({ getEdgeParams: () => ({ sx: 0, sy: 0, tx: 10, ty: 10, sourcePos: "right", targetPos: "left" }) }));
const props = { id: "edge", source: "a", target: "b", sourceX: 0, sourceY: 0, targetX: 10, targetY: 10, sourcePosition: "right", targetPosition: "left" } as ComponentProps<typeof FloatingSmoothStepEdge>;
describe("FloatingSmoothStepEdge capabilities", () => { it("does not expose direct removal to a read-only Viewer", () => { render(<FloatingSmoothStepEdge {...props} data={{ readOnly: true }} />); expect(screen.queryByTitle("Remove Connection")).not.toBeInTheDocument(); }); });
