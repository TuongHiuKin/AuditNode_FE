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
  - **Collapsible App Palette**: Features a flyout drawer design that slides over the canvas, maximizing workspace. Implemented with Tailwind CSS animations and absolute positioning.
  - **Interaction**: Supports Drag-and-Drop (DnD) of unmapped applications from the palette onto the canvas to create new nodes.
- **EditEntityDrawer**: 
  - **Design**: Uses **React Portals** (`ReactDOM.createPortal`) to render at the root of the DOM tree (`document.body`).
  - **Layout**: This architecture ensures the drawer completely escapes parent layout constraints such as `overflow: hidden` or stacking context issues, providing a reliable slide-out experience with a high Z-index overlay.
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
