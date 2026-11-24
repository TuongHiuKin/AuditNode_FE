# Frontend Architecture

AuditNode follows an FSD-Lite structure: application shell and routing in `src/app`, catalog and dependency-graph behavior in `src/features`, and reusable authentication, API, catalog-access, UI and utility code in `src/shared`.

## Authentication and session lifecycle

The frontend uses custom Login and Register pages backed by the ASP.NET auth gateway. The backend owns identity (ASP.NET Core Identity); no external identity provider or SSO library is part of the runtime flow.

The access token exists only in the in-memory auth store. The refresh token is an `HttpOnly` cookie owned by the backend. Application bootstrap attempts one cookie refresh before resolving to authenticated or anonymous state. The API client performs single-flight refresh on eligible `401` responses and retries at most once. Terminal failure and logout clear auth state and React Query cache.

## Global Catalog isolation and sharing

Catalog records are partitioned by `ownerUserId`; there is no runtime Workspace provider or `X-Workspace-Id` header. `CatalogAccessProvider` scopes query keys by authenticated principal, `mine`/`shared` view, filters and selected owner. Direct Label Grants expose label-scoped Viewer or Editor capabilities, while anonymous Viewer links resolve through the public-share endpoints. Principal changes and logout clear cached catalog data.

## Inventory contracts

Server writes use canonical collection/detail routes. Import uses `/api/v1/inventory/import` multipart upload. Application writes use exact local transport types for labels and deployment data, including explicit `PortMappingId` for deployment update or migration. Focused invalidation replaces full-page reloads.

## XYFlow graph model

Dependency application nodes represent deployments, not application records: node identity and reference use `PortMappingId`, with typed `appId`, `serverId` and `portMappingId` data. Connections map to stable deployment nodes and sync with `destinationPortMappingId`.

Canonical topology state uses `/api/v1/topology/state`. UI node types translate to backend `frame`, `group`, `server` and `application` types while preserving parents, coordinates, dimensions, handles, labels and reference IDs. Label filtering preserves deployment identity and cannot overwrite the unfiltered complete state.

## Export and loading boundaries

Inventory exports use repeated `ids` query parameters, map datacenter/labels/deployment fields, and sanitize formula-prefixed cells. Graph audit export uses the same sanitizer and current owner/catalog scope.

InventoryLayout, Inventory, Topology and Dependency Manager are route-level lazy chunks. Bulk Import is component-lazy, and SheetJS loads through dynamic import. Phase 8 reduced the main production JavaScript chunk from 1,256.38 kB to 400.01 kB; XLSX is isolated in a 429.53 kB lazy chunk.

## Verification

```powershell
npm.cmd run test:ci
npm.cmd run typecheck
npm.cmd run build
npm.cmd run sync-api:check
```

CI verifies the committed OpenAPI artifact checksum and backend commit metadata before regenerating the TypeScript contract twice. It does not fetch a live or unpinned URL.
