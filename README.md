# Audit System - Infrastructure & Dependency Management

[![Backend](https://img.shields.io/badge/Backend-.NET%2010-blue)](./BE/AuditNode.Backend)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-green)](./Interface/Build%20UI%20for%20Audit%20System)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-blue)](./doc/DATABASE.md)

Audit System is a specialized tool for IT Infrastructure teams to visualize, track, and manage complex server-application ecosystems. It provides a real-time topology map and a dynamic dependency graph with rich interaction capabilities.

---

## 🚀 Features

- **Inventory Tracking**: Manage servers, applications, and their port mappings across multiple environments.
- **Universal Search**: Intelligent search with debounce and autocomplete to quickly locate servers or applications globally.
- **Topology Map (Static Inventory)**: A rigid, auto-layout grid visualization of Servers containing their hosted Applications.
- **Dependency Manager**: 
  - Interactive graph using **XYFlow**.
  - **Performance Filters**: Slice data by Environment or Datacenter.
  - **Image Export**: Capture and download graph snapshots as PNG.
  - **Quick Add**: Direct infrastructure registration from the visualization viewport.
- **Clean Architecture**: Decoupled backend layers with transaction-based data integrity.

---

## 📈 Current Status

### Recent Progress
- ✅ **Inventory UX Refinements**: Enforced domain boundaries on nested grids, implemented dual state invalidation for real-time tab synchronization, and fixed DTO payload mismatches for seamless application migration.
- ✅ **Dynamic Network Sync**: Implemented "Save Network State" functionality with automated ID parsing and `destPortId` mapping.
- ✅ **Smart Edge Routing**: Developed a **Dynamic Intersection Algorithm** for floating edges to prevent content clipping and loops.
- ✅ **Infrastructure Layout**: Refactored server placement to a **2D Grid Layout** for improved scalability.
- ✅ **Interactive Polish**: Added edge reconnection, hover-to-reveal handles, and "Auto-fit to content" for server containers.
- ✅ **Custom Node Refactoring**: Redesigned Dependency Graph nodes with invisible "connect-anywhere" handles and fixed resizing bugs.
- ✅ **Intelligent Search**: Expanded Topology search logic to match both Servers (Hostname/IP) and Applications.
- ✅ **Canvas Panning UX**: Implemented smooth camera animation to center on search results within the Topology view.
- ✅ **Topology Refactoring**: Migrated to a "Static Resource Inventory" approach with nested nodes and auto-grid layout.
- ✅ **Data Integrity**: Implemented a **Transaction-based Upsert pattern** for Application registration.

### Next Steps
- 🔐 **Keycloak IAM Integration**: Implementing centralized Authentication and Authorization.
- 📊 **Advanced Analytics**: Developing deeper insights into dependency chains.

---

## 📂 Project Structure

```
AuditSystem/
├── BE/AuditNode.Backend/      # ASP.NET Core 10 Backend
│   ├── AuditNode.API/         # API Layer (Controllers)
│   ├── AuditNode.Application/ # Business Logic
│   ├── AuditNode.Domain/      # Entities
│   └── AuditNode.Infrastructure/ # Data Access (EF Core)
├── Interface/Build UI.../     # React 18 + Vite Frontend
│   ├── src/features/          # FSD-Lite Feature Modules
│   └── src/core/              # Shared API Client
├── DB_Project/                # Database SQL Scripts
├── docs/                      # Comprehensive Documentation
└── README.md                  # This file
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- **.NET 10 SDK**
- **Node.js** (v18+)
- **PostgreSQL** instance

### 2. Backend Setup
```bash
cd BE/AuditNode.Backend
# Update connection string in AuditNode.API/appsettings.json
dotnet build
dotnet run --project AuditNode.API
```

### 3. Frontend Setup
```bash
cd "Interface/Build UI for Audit System"
npm install
npm run dev
```

---

## 📖 Documentation

For detailed guides, please refer to the `docs/` folder:

- 🏛️ [Architecture Overview](./docs/ARCHITECTURE.md)
- 🔌 [API Endpoints](./docs/API.md)
- 🗄️ [Database Schema](./docs/DATABASE.md)

---

## 🤝 Contributing
Please follow the project's coding standards:
- **BE**: Use Clean Architecture patterns and async/await.
- **FE**: Adhere to the Feature-Sliced Design (Lite) structure under `src/features/`.
- **Doc**: Keep documentation updated with every architectural change.

---

**Last Updated:** June 7, 2026  
**Project Lead:** Gemini CLI
