# Frontend API Contracts

All calls use the shared Axios client. Authenticated tenant requests carry the in-memory bearer token and a valid `X-Workspace-Id`; refresh-cookie requests use credentials. URLs and ports remain environment-configured.

## Authentication gateway

| Method | Route | Notes |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Custom login UI; returns an access token for memory storage. |
| `POST` | `/api/v1/auth/register` | Custom registration UI; handles safe `409` and `503` responses. |
| `POST` | `/api/v1/auth/refresh` | Uses the backend-managed `HttpOnly` refresh cookie. |
| `POST` | `/api/v1/auth/logout` | Revokes the session; frontend state/cache is cleared even if upstream logout fails. |
| `GET` | `/api/v1/auth/me` | Returns the authenticated user and roles. |

Only login, register and refresh are anonymous. The frontend never stores access or refresh tokens in `localStorage` or `sessionStorage`.

## Workspaces

- `GET /api/v1/workspaces` loads accessible workspaces after authentication.
- No tenant request or `X-Workspace-Id` header is sent before a valid selection.
- Switching workspace removes old tenant cache and scopes subsequent query keys to the new workspace.

## Inventory

### Servers

- `GET /api/v1/servers`
- `GET /api/v1/servers/{id}`
- `POST /api/v1/servers`
- `PUT /api/v1/servers/{id}`
- `DELETE /api/v1/servers/{id}`
- `GET /api/v1/servers/export?ids=id1&ids=id2`

### Import

- `POST /api/v1/inventory/import` with canonical multipart `FormData`.
- The standard API client supplies authentication and workspace context; callers do not construct an Authorization header.

### Applications and deployments

- `GET /api/v1/applications`, with optional `labelKey` and `labelValue` filters.
- `GET /api/v1/applications/{id}`
- `POST /api/v1/applications`, supporting labels and an optional nested deployment.
- `PUT /api/v1/applications/{id}`, supporting metadata/labels and an explicit deployment update.
- `PUT /api/v1/applications/migrate`, requiring a non-empty `portMappingId`.
- `GET /api/v1/applications/export?ids=id1&ids=id2`

Deployment responses expose `PortMappingId`, server identity, port and protocol. Metadata-only updates do not infer or migrate the first deployment.

## Topology and dependencies

- `GET /api/v1/topology/map` returns servers, deployment application nodes and connections.
- `GET /api/v1/topology/state` loads canonical canvas state.
- `POST` or `PUT /api/v1/topology/state` persists nodes and edges, including frame/group hierarchy, position, size, handles, labels, type and reference IDs.
- `PUT /api/v1/dependencies/sync` uses `sourceAppId`, `destAppId` and `destinationPortMappingId`.

Application graph nodes are identified by `PortMappingId`, so one application deployed to two servers produces two distinct nodes. Client validation rejects self, duplicate and missing-deployment connections.

## Export safety

Spreadsheet cells whose first effective character is `=`, `+`, `-` or `@` are prefixed with an apostrophe, including values with leading spaces or tabs. Export filenames and rows use the current workspace name, falling back to workspace ID.

## Contract generation status

The generated OpenAPI file was not modified. Three generation attempts were unavailable because the local API process could not remain available under the current PowerShell/DataProtection/EventLog environment. No TLS bypass was used. Exact focused local types remain temporary until deterministic regeneration is possible.
