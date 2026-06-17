# API Documentation

The Audit System API provides endpoints for managing infrastructure and analyzing application dependencies. All endpoints are protected and require valid authentication.

## 🔐 Authentication & Authorization
The API integrates with **Keycloak IAM** for identity management.
- **Protocol**: OpenID Connect (OIDC) / OAuth 2.0.
- **Header**: `Authorization: Bearer <ACCESS_TOKEN>`
- **Token Management**: The frontend automatically handles token injection and silent refreshing using the `keycloak-js` adapter and Axios interceptors.
- **Development**: Ensure the local Keycloak server is running at `http://localhost:8080` with the `AuditNode-Realm`.

## 📍 Base URL
`http://localhost:5000/api/v1` (Default development)

## 📊 Analytics Endpoints

### Get Topology (Legacy Tree)
Retrieves the hierarchical infrastructure tree (Datacenter -> Server).
- **URL**: `/api/v1/topology/tree`
- **Method**: `GET`
- **Query Params**: 
  - `datacenterId` (optional): Filter by specific datacenter.
- **Success Response**: `200 OK` with JSON array of hierarchical nodes.

### Get Topology Map (Inventory)
Retrieves the flat infrastructure registry for the Topology Canvas.
- **URL**: `/api/v1/topology/map`
- **Method**: `GET`
- **Success Response**: `200 OK` with servers and their embedded applications.

### Get Dependencies
Retrieves the application dependency graph data.
- **URL**: `/api/v1/analytics/dependencies`
- **Method**: `GET`
- **Query Params**:
  - `environment` (optional): Filter by environment.
  - `datacenterId` (optional): Filter by datacenter.
- **Success Response**: `200 OK` with nodes and edges compatible with React Flow.

### Sync Network State
Synchronizes the current canvas connections with the backend database.
- **URL**: `/api/v1/dependencies/sync`
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
- `GET /api/v1/servers`: List all registered servers.
- `GET /api/v1/servers/{id}`: Get details of a specific server.
- `GET /api/v1/infrastructure/servers/{id}/deployed-apps`: List all applications currently hosted on the server.
- `POST /api/v1/servers`: Register a new server.
- `PUT /api/v1/servers/{id}`: Update an existing server.
- `DELETE /api/v1/infrastructure/servers/{id}/purge`: Permanently delete a server and all its hosted applications and network mappings.

### Applications (Registration Upsert)
- `GET /api/v1/applications`: List all applications.
- `GET /api/v1/applications/{id}`: Get details of a specific application.
- `GET /api/v1/infrastructure/apps/{id}/dependencies-count`: Get the number of active network dependencies for an application.
- `POST /api/v1/applications`: Register or Update an application.
  - **Logic**: Uses a **Transaction-based Upsert pattern**. If an `AppCode` already exists, the system updates the existing record and its port mappings instead of creating a duplicate. This ensures data consistency across the environment.
- `PUT /api/v1/applications/{id}`: Update an existing application or a specific deployment mapping.
  - **Payload**:
    ```json
    {
      "appName": "string",
      "ownerTeam": "string",
      "risk": "string",
      "portMappingId": "uuid",
      "serverId": "uuid",
      "portNumber": 443
    }
    ```
  - **Logic**: Supports multi-server deployments. If `portMappingId` is provided, the system updates that specific deployment record's server and port.
- `PUT /api/v1/infrastructure/apps/migrate`: Update the server residency and port mapping of an application.
- `DELETE /api/v1/infrastructure/apps/{id}/purge`: Permanently delete an application and cascade-delete all its linked dependencies.

### Datacenters
- `GET /api/v1/datacenters`: List all available datacenters.
- `POST /api/v1/datacenters`: Create a new datacenter location.

## 📥 Inventory Bulk Import

### Download Import Template
Retrieves an Excel template (.xlsx) for bulk importing servers and applications.
- **URL**: `/api/v1/inventory/import-template`
- **Method**: `GET`
- **Success Response**: `200 OK` (binary/blob)

### Bulk Import Inventory (Multipart)
Uploads an Excel file to process and save multiple servers and applications.
- **URL**: `/api/v1/inventory/import`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Success Response**: `200 OK`

### Partial Bulk Import (JSON)
Saves a list of pre-validated and normalized inventory records.
- **URL**: `/api/v1/inventory/bulk-import`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Payload**:
  ```json
  [
    {
      "serverName": "SRV-PROD-01",
      "ipAddress": "10.0.0.1",
      "appName": "PaymentGateway",
      "appCode": "PG-01",
      "port": 443,
      "environment": "Production"
    }
  ]
  ```
- **Success Response**: `200 OK`
- **Logic**: Performs iterative saves of the provided records. Designed for use with the browser-side "Fix & Commit" workflow.

## 🛠️ Global Configuration
The API uses a centralized `apiFetch` wrapper in the frontend to handle base URLs and content-type headers. CORS is enabled for local development on ports `5173` and `3000`.
