# Audit System - Infrastructure & Dependency Management

[![Backend](https://img.shields.io/badge/Backend-.NET%2010-blue)](./BE/AuditNode.Backend)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-green)](./Interface/Build%20UI%20for%20Audit%20System)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-blue)](./doc/DATABASE.md)

Audit System is a specialized tool for IT Infrastructure teams to visualize, track, and manage complex server-application ecosystems. It provides a real-time topology map and a dynamic dependency graph with rich interaction capabilities.

---

## 🚀 Features

- **Inventory Tracking**: Manage servers, applications, and their port mappings across multiple environments.
- **Infrastructure Registry View**: A hierarchical visualization of Datacenters → Servers → Applications.
- **Dependency Manager**: 
  - Interactive graph using **React Flow**.
  - **Performance Filters**: Slice data by Environment or Datacenter.
  - **Drag & Drop**: Easily add applications from the palette to the canvas.
  - **Image Export**: Capture and download graph snapshots as PNG.
  - **Quick Add**: Direct infrastructure registration from the visualization viewport.
- **Clean Architecture**: Decoupled backend layers for scalability and testability.

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
├── doc/                      # Comprehensive Documentation
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

For detailed guides, please refer to the `doc/` folder:

- 🏛️ [Architecture Overview](./doc/ARCHITECTURE.md)
- 🔌 [API Endpoints](./doc/API.md)
- 🗄️ [Database Schema](./doc/DATABASE.md)

---

## 🤝 Contributing
Please follow the project's coding standards:
- **BE**: Use Clean Architecture patterns and async/await.
- **FE**: Adhere to the Feature-Sliced Design (Lite) structure under `src/features/`.
- **Doc**: Keep documentation updated with every architectural change.

---

**Last Updated:** May 18, 2026  
**Project Lead:** Gemini CLI
