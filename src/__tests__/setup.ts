// Global test setup — imported by vitest before every test file.
// Extends vitest's `expect` with @testing-library/jest-dom matchers
// (e.g. toBeInTheDocument, toHaveTextContent, toBeVisible, etc.)
import "@testing-library/jest-dom";
import { vi } from "vitest";
import { setAuthenticatedSession } from "../shared/auth/authStore";
import { setSelectedWorkspaceId } from "../shared/workspace/workspaceStore";

// Polyfill ResizeObserver for ReactFlow tests
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = ResizeObserverMock;

// Polyfill scrollIntoView for JSDOM
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

setAuthenticatedSession("test-memory-token", {
  id: "test-user-id",
  username: "Test User",
  roles: ["Admin"],
});
setSelectedWorkspaceId("11111111-1111-4111-8111-111111111111", { persist: false });

