# API Documentation

The Audit System API provides endpoints for managing infrastructure and analyzing application dependencies.

## 📍 Base URL
`http://localhost:5000/api` (Default development)

## 📊 Analytics Endpoints

### Get Topology (Legacy Tree)
Retrieves the hierarchical infrastructure tree (Datacenter -> Server).
- **URL**: `/api/Topology/tree`
- **Method**: `GET`
- **Query Params**: 
  - `datacenterId` (optional): Filter by specific datacenter.
- **Success Response**: `200 OK` with JSON array of hierarchical nodes.

### Get Topology Map (Inventory)
Retrieves the flat infrastructure registry for the Topology Canvas.
- **URL**: `/api/Topology/map`
- **Method**: `GET`
- **Success Response**: `200 OK` with servers and their embedded applications.

### Get Dependencies
Retrieves the application dependency graph data.
- **URL**: `/api/Analytics/dependencies`
- **Method**: `GET`
- **Query Params**:
  - `environment` (optional): Filter by environment.
  - `datacenterId` (optional): Filter by datacenter.
- **Success Response**: `200 OK` with nodes and edges compatible with React Flow.

### Sync Network State
Synchronizes the current canvas connections with the backend database.
- **URL**: `/api/dependencies/sync`
- **Method**: `PUT`
- **Payload**:
  ```json
  {
    "dependencies": [
      { 
        "sourceAppId": "uuid", 
        "destAppId": "uuid", 
        "destPortId": "uuid" 
      }
    ]
  }
  ```
- **Success Response**: `200 OK`
- **Logic**: Performs a delta-diff to insert new connections and remove deleted ones while respecting database constraints.

## 🖥️ Infrastructure Endpoints

### Servers
- `GET /api/Servers`: List all registered servers.
- `GET /api/Servers/{id}`: Get details of a specific server.
- `GET /api/infrastructure/servers/{id}/deployed-apps`: List all applications currently hosted on the server.
- `POST /api/Servers`: Register a new server.
- `PUT /api/Servers/{id}`: Update an existing server.
- `DELETE /api/infrastructure/servers/{id}/purge`: Permanently delete a server and all its hosted applications and network mappings.

### Applications (Registration Upsert)
- `GET /api/Applications`: List all applications.
- `GET /api/Applications/{id}`: Get details of a specific application.
- `GET /api/infrastructure/apps/{id}/dependencies-count`: Get the number of active network dependencies for an application.
- `POST /api/Applications`: Register or Update an application.
  - **Logic**: Uses a **Transaction-based Upsert pattern**. If an `AppCode` already exists, the system updates the existing record and its port mappings instead of creating a duplicate. This ensures data consistency across the environment.
- `PUT /api/Applications/{id}`: Update an existing application.
- `PUT /api/infrastructure/apps/migrate`: Update the server residency and port mapping of an application.
- `DELETE /api/infrastructure/apps/{id}/purge`: Permanently delete an application and cascade-delete all its linked dependencies.

### Datacenters
- `GET /api/Datacenters`: List all available datacenters.
- `POST /api/Datacenters`: Create a new datacenter location.

## 📥 Inventory Bulk Import

### Download Import Template
Retrieves an Excel template (.xlsx) for bulk importing servers and applications.
- **URL**: `/api/inventory/import-template`
- **Method**: `GET`
- **Success Response**: `200 OK` (binary/blob)

### Bulk Import Inventory
Uploads an Excel file to process and save multiple servers and applications.
- **URL**: `/api/inventory/import`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Success Response**: `200 OK`
  - **Body**:
    ```json
    {
      "totalProcessed": 10,
      "savedCount": 8,
      "errors": [
        { "row": 3, "message": "Invalid IP format" }
      ],
      "conflicts": [
        { "row": 5, "message": "Server hostname already exists" }
      ]
    }
    ```

## 🛠️ Global Configuration
The API uses a centralized `apiFetch` wrapper in the frontend to handle base URLs and content-type headers. CORS is enabled for local development on ports `5173` and `3000`.
