# Frontend Architecture

AuditNode follows an FSD-Lite structure: application shell and routing in `src/app`, dependency graph behavior in `src/features`, and reusable authentication, API, workspace, UI and utility code in `src/shared`.

## Authentication and session lifecycle

The frontend uses custom Login and Register pages backed by the ASP.NET auth gateway. Keycloak remains the identity provider behind the backend; `keycloak-js` and the hosted Keycloak UI are not part of the runtime flow.

The access token exists only in the in-memory auth store. The refresh token is an `HttpOnly` cookie owned by the backend. Application bootstrap attempts one cookie refresh before resolving to authenticated or anonymous state. The API client performs single-flight refresh on eligible `401` responses and retries at most once. Terminal failure and logout clear auth state, workspace state and React Query cache.

## Workspace isolation

`WorkspaceProvider` loads accessible workspaces after authentication and exposes the validated active workspace. Tenant query keys include `workspaceId`. The API client omits the workspace header until selection is valid. Switching workspace removes old tenant cache; logout clears workspace selection and cache.

## Inventory contracts

Server writes use canonical collection/detail routes. Import uses `/api/v1/inventory/import` multipart upload. Application writes use exact local transport types for labels and deployment data, including explicit `PortMappingId` for deployment update or migration. Focused invalidation replaces full-page reloads.

## XYFlow graph model

Dependency application nodes represent deployments, not application records: node identity and reference use `PortMappingId`, with typed `appId`, `serverId` and `portMappingId` data. Connections map to stable deployment nodes and sync with `destinationPortMappingId`.

Canonical topology state uses `/api/v1/topology/state`. UI node types translate to backend `frame`, `group`, `server` and `application` types while preserving parents, coordinates, dimensions, handles, labels and reference IDs. Label filtering preserves deployment identity and cannot overwrite the unfiltered complete state.

## Export and loading boundaries

Inventory exports use repeated `ids` query parameters, map datacenter/labels/deployment fields, and sanitize formula-prefixed cells. Graph audit export uses the same sanitizer and current workspace identity.

InventoryLayout, Inventory, Topology and Dependency Manager are route-level lazy chunks. Bulk Import is component-lazy, and SheetJS loads through dynamic import. Phase 8 reduced the main production JavaScript chunk from 1,256.38 kB to 400.01 kB; XLSX is isolated in a 429.53 kB lazy chunk.

## Verification

```powershell
npm.cmd run test:ci
npx.cmd tsc --noEmit
npm.cmd run build
```

OpenAPI regeneration remains deferred after three unavailable local attempts caused by API startup behavior involving DataProtection/EventLog in the PowerShell environment. The generated file is unchanged, and TLS checks were not bypassed.
