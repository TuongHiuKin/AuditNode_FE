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

## [2026-06-01] Stabilize Registration and Finalize Topology UI
**Context:** Finalizing the infrastructure inventory UI and ensuring data integrity on the backend.
**Prompt:**
Refactor UI Topology for Static Inventory, implement DB transaction upsert to prevent duplicate keys, fix UI z-index bugs, and implement on-navigate state synchronization.

1. DATA INTEGRITY (Backend):
- Implement a Transaction-based Upsert pattern for Application Registration.
- Add a UNIQUE constraint to 'AppCode' in the database.

2. UI REFINEMENT (Frontend):
- Finalize the 'Static Resource Inventory' layout in the Topology Map.
- Ensure React Flow uses Nested Nodes/Containers for Servers and Apps.
- Implement a symmetrical Grid Auto-layout that prevents node overlap.
- Disable manual node dragging in the Topology view.
- Implement automatic data refresh on-navigation using 'useLocation'.
- Fix Z-index collisions between navigation dropdowns and the Sidebar.

## [2026-06-02] Build Bulk Import Modal UI and Logic
**Context:** Implementing Excel bulk import with template download, multipart upload, and result visualization.
**Prompt:**
Build the UI for the Bulk Import Modal with Download Template and Upload & Process actions.

1. DOWNLOAD TEMPLATE:
- Implement `onClick` to call `GET /api/inventory/import-template`.
- Use `blob()` response to trigger download of `Inventory_Import_Template.xlsx`.

2. UPLOAD & PROCESS:
- Add file input for `.xlsx` and "Upload & Process" button using `POST /api/inventory/import` with `multipart/form-data`.

3. RESULT VISUALIZATION:
- Handle response: `{ totalProcessed, savedCount, errors, conflicts }`.
- Render success alert for `savedCount > 0`.
- Render red table for `errors` and amber/yellow table for `conflicts`.
- Provide "Done/Close" button with `onSuccess` callback to refresh parent grid.

4. TDD & INTEGRATION:
- Create `src/__tests__/BulkImportModal.test.tsx`.
- Integrate into `Inventory.tsx`.

## [2026-06-04] Implement Edit Entity Drawer (Flyout)
**Context:** Implementing a side drawer for updating servers and applications with live data fetching and form binding.
**Prompt:**
Implement the "Update" feature for the Infrastructure Inventory page using a Side Drawer (Flyout) to maintain user context.

1. DRAWER UI (Tailwind & Motion):
- Create a sliding side drawer anchored to the right with backdrop-blur.
- Style with dark theme (`bg-[#0f172a]`) and include header/close button.

2. DATA FETCHING & BINDING:
- Accept `entityId` and `entityType` ("APP" or "SERVER") as props.
- Call `GET /api/applications/{id}` (or servers) on open to fetch latest data.
- Bind to React Hook Form with `App Code` and `IP Address` as read-only fields.

3. SUBMISSION & FEEDBACK:
- Call `PUT /api/applications/{id}` (or servers) on submit.
- On success: close drawer, show toast (sonner), and refresh grid via `onUpdateSuccess` callback.

4. TDD & INTEGRATION:
- Create `src/__tests__/EditEntityDrawer.test.tsx`.
- Integrate into `Inventory.tsx`, `ServerTable.tsx`, and `AppTable.tsx` via `ActionButtons`.

## [2026-06-04] Refactor Dependency Manager App Palette to Flyout Drawer
**Context:** Optimizing canvas space by converting the permanent sidebar into a collapsible flyout drawer.
**Prompt:**
Refactor the Dependency Graph Manager's App Palette into a collapsible flyout drawer to maximize canvas space.

1. COLLAPSIBLE STATE & FLYOUT LOGIC:
- Implement `isPaletteOpen` state in `DependencyManagerContent`.
- Wrap `AppPalette` in an absolute container with Tailwind CSS transition classes (`-translate-x-full` to `translate-x-0`).
- Add a sleek close button (`X`) inside the palette and a floating toggle button (`+ Apps`) on the canvas to reopen it.

2. UI & ANIMATION:
- Style the drawer with glass-morphic effects, shadows (`shadow-2xl`), and a larger width (`w-72`).
- Ensure the React Flow canvas expands to 100% width while the palette overlaps when active.

3. DND PRESERVATION & TESTING:
- Maintain 100% integrity of Drag-and-Drop (DnD) functionality from the palette to the canvas.
- Update `AppPalette.test.tsx` and `DependencyManager.test.tsx` with new test cases for toggle logic, visibility transitions, and accessibility (aria-labels).
- Update `docs/ARCHITECTURE.md` to reflect the new interactive design.
