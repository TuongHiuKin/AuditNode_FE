# Project Architecture

## Overview
The Audit System is a full-stack application designed for infrastructure tracking and dependency visualization. It consists of a robust .NET backend and a highly interactive React frontend.

## 🏗️ System Components

### 1. Backend (`/BE/AuditNode.Backend`)
Built with **ASP.NET Core 10.0**, following **Clean Architecture** principles.

- **Transaction-based Upsert Pattern**: The Application Registration logic uses a robust transaction pattern to handle "Insert or Update" operations. This ensures that even in high-concurrency scenarios, the `AppCode` UNIQUE constraint is respected, and the internal `port_mappings` are synchronized without creating orphans or duplicates.
- **Presentation Layer (`AuditNode.API`)**: RESTful controllers.
- **Application Layer (`AuditNode.Application`)**: Business logic and DTOs.
- **Infrastructure Layer (`AuditNode.Infrastructure`)**: EF Core with PostgreSQL.

### 2. Frontend (`/Interface/Build UI for Audit System`)
Built with **React 18**, **TypeScript**, and **Vite**.

- **Universal Search**: 
  - **Design**: Implements a controlled search component with 500ms debounce.
  - **Functionality**: Fetches global results (Servers/Apps) and provides deep-linking navigation to the Inventory module with active filtering.
- **Topology Map (Static Resource Inventory)**: 
  - **Design**: Uses **XYFlow (React Flow)** with a custom `topologyServerNode` that acts as a nested container for applications.
  - **Auto-layout**: Implements a symmetrical Grid Auto-layout algorithm that re-calculates node positions when containers expand or collapse.
  - **Local Canvas Search**: Features a 2-tier matching system that scans both Server metadata (hostname/IP) and Application attributes (name/port).
  - **Canvas Panning**: Selecting a search result triggers a smooth, animated camera pan and zoom (`setCenter`) to the target node, providing immediate visual context.
  - **Interaction**: Manual dragging is disabled to maintain inventory structure. Navigation triggers automatic state synchronization via `useLocation` and TanStack Query cache invalidation.
- **Dependency Graph Manager (Dynamic Service Mapping)**:
  - **Design**: An interactive canvas for mapping service-to-service dependencies and network flows.
  - **Environment Context Preservation**: Implements a robust context-passing mechanism between the Inventory and Dependency Manager modules. Deep links now include an `environment` parameter that is normalized and prioritized during initialization to prevent race conditions and ensure the destination graph matches the source context (e.g., automatically switching to "Production" when viewing a production server's dependencies).
  - **Auto-layout**: Implements a **2D Grid layout algorithm** (3 columns) for initial server placement, ensuring organized visualization even in dense environments like Production.
  - **Smart Floating Edges**: Uses a custom **Dynamic Intersection Algorithm** to calculate connection points on node borders in real-time. This prevents edges from clipping through icons/text and ensures clean 90-degree orthogonal routing around assets.
  - **Edge Reconnection**: Supports interactive re-routing by dragging edge endpoints to new target nodes, powered by `@xyflow/react` utilities.
  - **Sync Logic**: Features a differential synchronization engine that extract raw UUIDs from composite React Flow IDs and maps connections to the required `destPortId` field before saving to the database.
  - **Custom Nodes Refactor**:
    *   **AppNode**: Redesigned as a sharp rectangle with 4-sided, hover-reveal handles to balance connectivity and visual clarity.
    *   **ServerGroupNode**: Optimized for dynamic resizing with an "Auto-fit to content" function that precisely wraps children nodes using bounding-box geometry.
- **EditEntityDrawer**: 
  - **Design**: Uses **React Portals** (`ReactDOM.createPortal`) to render at the root of the DOM tree (`document.body`).
  - **Adaptive Deployment Selector**: Implements a dynamic UI block that renders when an application has multiple deployments (1-to-Many). Uses a **Radio Group pattern** to target a specific port mapping for modification.
  - **Force Hydration Pattern**: Programmatically synchronizes `react-hook-form` state upon deployment selection, ensuring strict validation and reliable payload construction.
  - **Combobox Integration**: Features a searchable, filtered infrastructure selector with a "Clear on Open" UX and forgiving multi-field matching logic.
  - **Layout**: This architecture ensures the drawer completely escapes parent layout constraints such as `overflow: hidden` or stacking context issues, providing a reliable slide-out experience with a high Z-index overlay.
- **IAM Integration (Keycloak)**:
  - **Authentication**: Uses `keycloak-js` for OIDC-compliant authentication.
  - **Initialization**: App initialization is guarded in `main.tsx`; the React tree only renders after a successful Keycloak `init`.
  - **Token Management**: Implements an async Axios interceptor that calls `keycloak.updateToken()` before every request, ensuring no calls are made with expired credentials.
  - **Identity**: Exposes a `getUsername()` utility for personalized UI components (e.g., Topbar).
- **Iterative Bulk Import**:
  - **Design**: Implements an enterprise-grade "Parse-Validate-Fix" workflow for Excel ingestion.
  - **Data Normalization**: Intercepts raw Excel JSON and maps human-readable headers (with spaces) to strict internal camelCase keys.
  - **In-Browser Triage**: Performs immediate validation using a robust engine (regex-based IP/Port/AppCode checks) to categorize rows as "Ready" or "Error" before they reach the server.
  - **Iterative Commit Pattern**: Supports "Partial Imports" where successfully saved rows are removed from local state, while erroneous rows persist in an interactive review grid for inline correction.
  - **Inline Editing**: Utilizes reactive UI components that re-validate individual records on-the-fly, providing instant feedback and visual cues (badges/tooltips) for data correction.
- **State Management**: React Hooks and TanStack Query for efficient caching.
- **Styling**: Tailwind CSS with custom Z-index layering for overlays and sidebars.

## 🔄 Communication Flow
1. The **React Frontend** sends HTTP requests to the **.NET API**.
2. The API authenticates/authorizes (placeholder for Keycloak) and processes the request.
3. The **Infrastructure Layer** queries the **PostgreSQL Database** (using optimized Views for complex joins).
4. Data is returned as JSON and rendered dynamically on the UI.

## 🛠️ Tech Stack Summary
- **Backend**: C#, .NET 10, EF Core, Npgsql, PostgreSQL.
- **Frontend**: TypeScript, React, Vite, Tailwind CSS, XYFlow.
- **DevOps**: Git, PowerShell scripts for environment setup.
