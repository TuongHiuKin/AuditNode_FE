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

## [2026-05-23] Configure type-safe API synchronization with openapi-typescript
**Context:** Setting up a type-safe API pipeline, centralized Axios client with Keycloak interceptors, and TanStack Query refactoring.
**Prompt:**
Configure a type-safe API synchronization pipeline using OpenAPI TypeScript and a centralized Axios client.

1. NPM TOOLING SETUP:
- Install 'openapi-typescript' and 'axios' (using --legacy-peer-deps for TypeScript 6.x compatibility).
- Register "sync-api" script: "openapi-typescript http://localhost:5000/openapi/v1.json --output src/shared/api/v1-contract.ts".

2. CENTRALIZED API CLIENT BINDING:
- Create 'src/shared/api/client.ts' with an Axios instance consuming generated 'v1-contract.ts' types.
- Configure request interceptors to inject Keycloak Bearer Tokens into 'Authorization' headers.
- Refactor ReactFlow components and TanStack Query hooks (useDependencyLogic, ServerTable, AppTable, Topology) to bind directly to generated contract schemas.

3. VALIDATION & TESTING:
- Update existing Vitest suites (ServerTable, AppTable, Topology, DependencyManager) to mock the new Axios client and use QueryClientProvider.
- Ensure all infrastructure properties (ipAddress, appName, portNumber) match the backend's camelCase DTOs.

## [2026-05-23] Synchronize with Scalar Backend and Refactor DTOs
**Context:** Updating endpoint to https://localhost:7126, handling self-signed certificates, and refactoring to new DTO names (ServerResponseDto, ApplicationResponseDto, etc.).
**Prompt:**
Synchronize the Frontend with the live Scalar-enabled Backend at https://localhost:7126/openapi/v1.json.

1. ENDPOINT UPDATE & SECURITY:
- Update 'sync-api' in 'package.json' to 'https://localhost:7126/openapi/v1.json'.
- Use 'cross-env NODE_TLS_REJECT_UNAUTHORIZED=0' to bypass self-signed certificate errors during local synchronization.
- Update default 'API_BASE' in 'src/shared/api/client.ts' to 'https://localhost:7126'.

2. DTO REFACTORING:
- Refactor 'useDependencyLogic.ts' to map new 'DependencyMapDto' (grouped servers/apps) to flat ReactFlow nodes.
- Update 'ServerTable.tsx' to consume 'ServerResponseDto' and use 'applications' instead of 'apps'.
- Update 'AppTable.tsx' to consume 'ApplicationResponseDto'.
- Update 'Topology.tsx' to flatten 'TopologyTreeDto' (datacenter-grouped) for the tree view and map 'applications' instead of 'ports'.

3. TEST COMPLIANCE:
- Update Vitest mocks in 'Topology.test.tsx' and 'DependencyManager.test.tsx' to reflect the new nested DTO structures.
- Ensure 100% pass rate for all 22 tests.


