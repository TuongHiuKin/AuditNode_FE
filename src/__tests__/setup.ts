// Global test setup — imported by vitest before every test file.
// Extends vitest's `expect` with @testing-library/jest-dom matchers
// (e.g. toBeInTheDocument, toHaveTextContent, toBeVisible, etc.)
import "@testing-library/jest-dom";
import { vi } from "vitest";

// Polyfill ResizeObserver for ReactFlow tests
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = ResizeObserverMock;

