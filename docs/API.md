# API Documentation

The Audit System API provides endpoints for managing infrastructure and analyzing application dependencies.

## 📍 Base URL
`http://localhost:5000/api` (Default development)

## 📊 Analytics Endpoints

### Get Topology
Retrieves the infrastructure registry and topology map.
- **URL**: `/analytics/topology`
- **Method**: `GET`
- **Query Params**: 
  - `environment` (optional): `Production`, `Development`, etc.
  - `datacenterId` (optional): Filter by specific datacenter UUID.
- **Success Response**: `200 OK` with JSON array of servers and their ports.

### Get Dependencies
Retrieves the application dependency graph data.
- **URL**: `/analytics/dependencies`
- **Method**: `GET`
- **Query Params**:
  - `environment` (optional): Filter by environment.
  - `datacenterId` (optional): Filter by datacenter.
- **Success Response**: `200 OK` with nodes and edges compatible with React Flow.

## 🖥️ Infrastructure Endpoints

### Servers
- `GET /servers`: List all registered servers.
- `GET /servers/{id}`: Get details of a specific server.
- `POST /servers`: Register a new server.
- `PUT /servers/{id}`: Update server configuration.
- `DELETE /servers/{id}`: Decommission a server.

### Applications
- `GET /applications`: List all deployed applications.
- `POST /applications`: Register a new application.
- `GET /applications/{id}/dependencies`: Get specific application dependency map.

## 🛠️ Global Configuration
The API uses a centralized `apiFetch` wrapper in the frontend to handle base URLs and content-type headers. CORS is enabled for local development on ports `5173` and `3000`.
