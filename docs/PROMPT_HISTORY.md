# Prompt History Log

## [2026-05-21] Implement Frontend layout and ReactFlow configurations
**Context:** Mirroring Figma UI for Topology and Dependency screens with ReactFlow and TDD.
**Prompt:**
Implement the Frontend layout components and ReactFlow configurations to perfectly mirror the approved Figma UI for both Topology and Dependency screens.

1. DEPENDENCY MANAGER CANVAS (ReactFlow Integration):
- Configure ReactFlow to use default dynamic BEZIER CURVED lines for edges.
- Implement a custom 'ServerGroupNode' component (parent bounding box, dashed border, icon, header).
- Render internal Application nodes as pills inside parent boxes.

2. SUB-TOOLBAR & AUTOMATION ACTIONS:
- Create sub-toolbar (+ Add Server, + Add Datacenter, "Auto-Map from DB").
- Trigger API fetch to '/api/dependency/map' on "Auto-Map" click.
- Use 'useMemo' for 'nodeTypes'.

3. TOPOLOGY HIERARCHICAL TREE VIEW:
- Restructure 'Topology Map' into top-down tree grid (Datacenter -> Server -> Port).
- Add filter bar for "Display Node Limit".

4. VITEST COMPLIANCE:
- Create 'src/__tests__/DependencyManager.test.tsx' mocking map data.

## [2026-05-21] Integrate live backend REST APIs and TanStack Query
**Context:** Live API integration, caching with TanStack Query, and dynamic node sizing.
**Prompt:**
Integrate live backend REST APIs into the ReactFlow Dependency Canvas and Topology Tree viewports.

1. API INTEGRATION & CACHING (TanStack Query / Axios):
- Replace all legacy mock data structures inside 'FlowCanvas.tsx' and 'Topology.tsx' with dynamic live hooks fetching from '/api/dependency/map' and '/api/topology/tree'.
- Configure a global 'staleTime' of 5 minutes for these infrastructure queries. This ensures that switching tabs between 'Topology Map' and 'Dependency Manager' retrieves data directly from the cache instantly, eliminating redundant server requests and freezing/lagging.

2. WORKFLOW & DYNAMIC LAYOUT ENGINE:
- Link the "Auto-Map from DB" toolbar button to actively invalidate the query cache and force a fresh fetch from the database. Show a responsive loading skeleton frame while the fetch is active.
- DYNAMIC BOUNDS: In 'ServerGroupNode.tsx', write a layout calculation rule to dynamically adjust the width and height offsets of the gray dashed bounding box border based on the array length of the live child applications fetched, preventing node visual overlapping.

3. VITEST SUITE COMPLIANCE:
- Update 'src/__tests__/DependencyManager.test.tsx' using MSW (Mock Service Worker) or standard Vitest spy network mocks to simulate active API loading and success states. Assert that the 'ServerGroupNode' container safely parses the real IP string and prints it without throwing TypeErrors.

## [2026-05-31] Refactor Topology Network Map to Static Resource Inventory
**Context:** Refactoring the Topology UI to use isolated React Flow components with auto-layout and expandable nested nodes, while keeping Dependency Manager untouched.
**Prompt:**
Completely refactor the Topology Network Map UI to follow a "Static Resource Inventory" approach using Nested Nodes (Group Nodes) and an Auto-layout Grid.

1. ARCHITECTURAL ISOLATION:
- Create dedicated components (`TopologyCanvas`, `TopologyServerNode`) and logic (`useTopologyLogic`) to ensure the Dependency Manager remains completely untouched and functional.
- Re-implement the 'Static Resource Inventory' layout for the Topology page using a strictly isolated approach.

2. CANVAS & GLOBAL CONFIGURATION:
- Disable manual dragging by setting `nodesDraggable={false}` on the `<ReactFlow />` component.
- Inject the `<MiniMap position="bottom-right" />` component.
- Eliminate the hierarchical "Root Node" (Datacenter) from the graph data. Handle Datacenter context via a dynamic dropdown filter fetching from `/api/Datacenters`.
- Default the Environment dropdown to "Development".

3. EXPANDABLE SERVER CONTAINERS:
- Refactor the Custom Server Node to support `collapsed` and `expanded` states.
- **Collapsed State:** Display IP Address, Hostname, and an environment-based border (e.g., Blue for PROD). Include a toggle button showing the app count (`[+] X Apps`).
- **Expanded State:** Visually expand dimensions to act as a Parent Container. Child Applications must be registered as nodes with the `parentNode` property. The toggle button changes to `[-] Collapse`.
- Reposition the expansion toggle button to a fixed bottom-center location on both states.

4. DYNAMIC AUTO-LAYOUT ALGORITHM:
- Implement a custom symmetrical grid algorithm to align Server nodes.
- Re-trigger layout whenever a Server node toggles between states to automatically push away neighboring nodes and avoid overlaps.
- Remove all containment-related edges (lines) for visual clarity in the expanded view.

5. UX & TECHNICAL HARDENING:
- Open the Side Details Panel strictly on `onNodeDoubleClick`.
- Implement automatic data refresh (`refetch`) every time the user navigates to the Topology page using `useLocation`.
- Fix Z-index collisions between the filter bar dropdowns and the left sidebar.

6. VITEST COMPLIANCE:
- Update and add unit tests to validate the isolated implementation (`Topology.test.tsx`, `TopologyServerNode.test.tsx`, `useTopologyLogic.test.tsx`). Ensure 100% pass rate.
