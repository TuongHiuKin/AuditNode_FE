import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { WorkspaceProvider, useWorkspaceStore } from "../app/hooks/useWorkspaceStore";
import React from "react";

describe("useWorkspaceStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides initial empty state", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    const { result } = renderHook(() => useWorkspaceStore(), { wrapper });

    expect(result.current.workspaces).toEqual([]);
    expect(result.current.activeWorkspace).toBeNull();
  });

  it("sets workspaces and auto-selects the first one", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    const { result } = renderHook(() => useWorkspaceStore(), { wrapper });

    const mockWorkspaces = [
      { id: "1", name: "WS 1", description: "Desc 1" },
      { id: "2", name: "WS 2", description: "Desc 2" },
    ];

    act(() => {
      result.current.setWorkspaces(mockWorkspaces);
    });

    expect(result.current.workspaces).toEqual(mockWorkspaces);
    expect(result.current.activeWorkspace).toEqual(mockWorkspaces[0]);
  });

  it("updates active workspace and persists to localStorage", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    const { result } = renderHook(() => useWorkspaceStore(), { wrapper });

    const workspace = { id: "1", name: "WS 1", description: "Desc 1" };

    act(() => {
      result.current.setActiveWorkspace(workspace);
    });

    expect(result.current.activeWorkspace).toEqual(workspace);
    expect(localStorage.getItem("auditNode_activeWorkspace")).toEqual(JSON.stringify(workspace));
  });

  it("restores active workspace from localStorage on initialization", () => {
    const workspace = { id: "localStorage-ws", name: "Saved WS", description: "Saved Desc" };
    localStorage.setItem("auditNode_activeWorkspace", JSON.stringify(workspace));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceProvider>{children}</WorkspaceProvider>
    );

    const { result } = renderHook(() => useWorkspaceStore(), { wrapper });

    expect(result.current.activeWorkspace).toEqual(workspace);
  });

  it("throws error if used outside WorkspaceProvider", () => {
    // Suppress console.error for this test as we expect an error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => renderHook(() => useWorkspaceStore())).toThrow("useWorkspaceStore must be used within a WorkspaceProvider");
    
    consoleSpy.mockRestore();
  });
});
