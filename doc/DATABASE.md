# Database Documentation

The Audit System uses **PostgreSQL** as its primary data store, managed via **Entity Framework Core**.

## 📊 Entity Relationship Model

### Core Entities

#### 1. Servers (`servers`)
Tracks physical or virtual infrastructure units.
- `id` (UUID, PK)
- `hostname` (string)
- `ip_address` (string)
- `os_type` (string)
- `environment` (string: Production/Staging/Development)
- `datacenter_id` (UUID)

#### 2. Applications (`applications`)
Tracks software entities deployed across the infrastructure.
- `id` (UUID, PK)
- `app_code` (string)
- `app_name` (string)
- `owner_id` (UUID: Keycloak User ID)

#### 3. Port Mappings (`port_mappings`)
Connects applications to specific servers and ports.
- `id` (UUID, PK)
- `server_id` (FK -> servers)
- `app_id` (FK -> applications)
- `port_number` (int)
- `protocol` (string: TCP/UDP/HTTPS)

#### 4. App Dependencies (`app_dependencies`)
Maps connections between different applications.
- `id` (UUID, PK)
- `source_app_id` (FK -> applications)
- `dest_app_id` (FK -> applications)
- `dest_port_id` (FK -> port_mappings)
- `connection_type` (string)

## 👁️ Optimized Database Views
To support high-performance visualization, the system uses read-only views for complex data retrieval:

- **`v_topology_map`**: Flat mapping of servers, apps, and ports for the Infrastructure Registry.
- **`v_dependency_graph`**: Pre-joined view of source and destination applications for the Dependency Manager graph.

## 🛠️ Maintenance
Database changes should be performed via EF Core Migrations or using the provided SQL scripts in `/DB_Project`.
