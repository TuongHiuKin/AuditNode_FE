## 2026-06-06: Dependency Graph Node Refactoring & Resizing Fix

### Context
The Dependency Manager canvas had two major UI/UX issues: custom `AppNode` components were using a pill shape that didn't align with the enterprise theme and had fixed connection points, while `ServerGroupNode` (the container) had broken manual resizing and a cluttered `NodeResizer` UI.

### Solution
1. **AppNode Visual Transition**: Redesigned as a sharp rectangle (`rounded-none`).
2. **Invisible Connect-Anywhere Handles**: Replaced visible handle dots with 8 invisible handles (4 Source, 4 Target) on all sides (Top, Bottom, Left, Right). 
3. **Handle Interactivity Fix**: Removed `pointer-events-none` from handles and stretched them into large hitboxes (`!w-full`, `!h-full`) with high z-index to allow users to click anywhere near a border to start a connection.
4. **ServerGroupNode Resizing Fix**: Correctly bound the `width` and `height` props from `@xyflow/react` to the root container's style, ensuring the node respects the resizer's dimensions.
5. **Resizer Cleanup**: Removed the blue offset border from `NodeResizer` and aligned square handles perfectly with the node's border.

### Impact
Significantly improved the visual clarity of service mappings and fixed a critical interaction bug that prevented edge connections. Also fixed a layout bug that prevented users from manually organizing server containers on the canvas.

## 2026-06-07: Dependency Manager UX Polish & Sync Implementation

### Context
The Dependency Manager required final polish to become production-ready. Issues included chaotic edge routing that clipped through node content, poor scalability of the initial horizontal layout, and a missing backend sync for the network state.

### Solution
1. **Dynamic Floating Edges**: Implemented a geometry-based intersection algorithm in `FloatingSmoothStepEdge.tsx`. This dynamically calculates the closest connection point on node perimeters, preventing content clipping.
2. **2D Grid Auto-layout**: Refactored the initial server placement logic from a single row to a 3-column grid, significantly improving visibility in dense environments.
3. **Database Sync Engine**: Developed the `handleSync` logic to bundle current edges into a backend-ready payload, featuring robust UUID extraction from composite React Flow IDs and mandatory `destPortId` mapping.
4. **Interactive Enhancements**: 
   - Restored drag-to-connect functionality with hover-reveal blue dots.
   - Implemented "Auto-fit to content" for server nodes using bounding-box math.
   - Added edge reconnection support for re-routing existing lines.
   - Blocked self-connections via `isValidConnection` validation.
5. **UI Streamlining**: Removed redundant toolbar controls and added a primary "Save Network State" action with loading feedback.

## 2026-06-08: Resource Inventory Grid Enhancements & Combobox Migration

### Context
The Infrastructure Inventory grid needed functional updates to support Application Migration (updating server residency) and a safe "Hard Delete" sequence. Later, the target server selection field became unmanageable as a native HTML select, and a critical bug was found where the grid was passing `PortMappingId` instead of `ApplicationId` for deletions.

### Solution
1. **Migration Drawer (`MigrationDrawer.tsx`)**: Created a dedicated side drawer to handle moving applications between infrastructure assets, fetching available servers dynamically.
2. **Safe Hard Delete Modal (`DeleteConfirmationModal.tsx`)**: Implemented a state-driven 3-step sequence. It performs a live pre-check via `/dependencies-count`, displays a context-aware warning (safe vs. critical), and forces a strict confirmation before executing a purge.
3. **Searchable Combobox Integration**: Upgraded the Target Server dropdown in `EditResourceDrawer` from a basic `<select>` to a fully-controlled `shadcn/ui` Combobox utilizing `cmdk`. Built custom typing, visibility, and selection logic to bypass portal event trapping and added a `scrollIntoView` polyfill to fix JSDOM testing issues.
4. **Data Parsing & ID Fixes**: Corrected an Axios response parsing bug that ignored raw numeric payloads for dependency counts. Also patched `ServerTable.tsx` to explicitly extract the true `applicationId` from nested DTOs, ensuring grid actions route correctly to backend endpoints.

### Impact
Significantly improved the safety and usability of resource management. Deletions are now aggressively protected against accidental network severance, and server migrations scale flawlessly in the UI, even with massive infrastructure datasets.



## 2026-06-09: Inventory UI/UX Refinements

### Context
The Infrastructure Inventory interface required polish to enforce domain boundaries (restricting nested row edits), fix data payload mismatches during application updates, and ensure that changes correctly invalidated state across all grid tabs simultaneously.

### Solution
1. **Domain Boundaries Enforced**: Removed edit and delete action buttons from nested child rows (Servers under Apps, Apps under Servers). All state mutations now strictly occur on primary domain rows.
2. **Payload Alignment & Tracing**: Refactored EditEntityDrawer.tsx to align frontend JSON payloads with Backend DTO expectations, replacing incorrect properties like 	argetServerId with serverId and 
ewPortNumber with portNumber. Added robust payload tracing in onSubmit for debugging.
3. **Searchable Combobox Binding Fix**: Fixed the shadcn/ui Combobox implementation inside EditEntityDrawer.tsx to properly register its selected value with eact-hook-form using shouldValidate: true and shouldDirty: true, preventing empty submissions.
4. **Dual State Invalidation**: Upgraded EditEntityDrawer and MigrationDrawer to accept dual success callbacks (onApplicationsUpdated and onServersUpdated). These now fire simultaneously upon successful API responses to enforce global cache invalidation across Inventory.tsx.
5. **Continuous Editing UX**: Removed automatic onClose() calls from drawer success handlers, allowing users to rapidly correct typos or execute multiple subsequent edits without reopening the panel.
6. **Safe Deletion UI Refinement**: Updated DeleteConfirmationModal to handle dynamic API fetching and critical warning renders for both Server cascade deletions and Application dependency removals.

### Impact
Resolved critical data corruption bugs caused by misaligned JSON payloads, eliminated stale UI data via robust state invalidation, and significantly improved the user's workflow by supporting continuous edits and clearer destructive-action warnings.
