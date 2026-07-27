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

// Polyfill scrollIntoView for JSDOM
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// Global mock for Keycloak Service
vi.mock("../services/keycloakService", () => ({
  initKeycloak: vi.fn((cb) => cb()),
  doLogout: vi.fn(),
  getToken: vi.fn(() => "mock-token"),
  updateToken: vi.fn(() => Promise.resolve(true)),
  getUsername: vi.fn(() => "Test User"),
  getUserRoles: vi.fn(() => ["Admin"]),
  hasRole: vi.fn((role) => role === "Admin"),
  hasAnyRole: vi.fn((roles) => roles.includes("Admin")),
  default: {
    token: "mock-token",
    tokenParsed: { preferred_username: "Test User", realm_access: { roles: ["Admin"] } },
    logout: vi.fn(),
    init: vi.fn().mockResolvedValue(true),
    updateToken: vi.fn().mockResolvedValue(true),
  },
}));

