# Project Architecture

## Overview
The Audit System is a full-stack application designed for infrastructure tracking and dependency visualization. It consists of a robust .NET backend and a highly interactive React frontend.

## 🏗️ System Components

### 1. Backend (`/BE/AuditNode.Backend`)
Built with **ASP.NET Core 10.0**, following **Clean Architecture** principles to ensure separation of concerns and maintainability.

- **Presentation Layer (`AuditNode.API`)**: RESTful controllers and API configuration.
- **Application Layer (`AuditNode.Application`)**: Core business logic, DTOs, and repository interfaces.
- **Domain Layer (`AuditNode.Domain`)**: Pure domain entities and shared models.
- **Infrastructure Layer (`AuditNode.Infrastructure`)**: Data persistence using **Entity Framework Core** and **PostgreSQL**.

### 2. Frontend (`/Interface/Build UI for Audit System`)
Built with **React 18** and **TypeScript**, optimized with **Vite**.

- **State Management**: React Hooks (useState, useEffect, useCallback).
- **Visualization**: **XYFlow (React Flow)** for interactive topology and dependency graphs.
- **Styling**: **Tailwind CSS** for a modern, dark-themed utility-first UI.
- **Icons**: **Lucide React** for consistent iconography.

## 🔄 Communication Flow
1. The **React Frontend** sends HTTP requests to the **.NET API**.
2. The API authenticates/authorizes (placeholder for Keycloak) and processes the request.
3. The **Infrastructure Layer** queries the **PostgreSQL Database** (using optimized Views for complex joins).
4. Data is returned as JSON and rendered dynamically on the UI.

## 🛠️ Tech Stack Summary
- **Backend**: C#, .NET 10, EF Core, Npgsql, PostgreSQL.
- **Frontend**: TypeScript, React, Vite, Tailwind CSS, XYFlow.
- **DevOps**: Git, PowerShell scripts for environment setup.
