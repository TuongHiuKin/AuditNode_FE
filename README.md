# AuditNode Frontend

React, TypeScript and Vite frontend for AuditNode inventory, topology and dependency management.

## Current architecture

- Authentication uses the backend auth gateway at `/api/v1/auth/*`. Login and registration remain custom React screens; the backend owns identity and issues its own tokens.
- Access tokens are held in memory only. Refresh tokens are backend-managed `HttpOnly` cookies and refresh requests use credentials.
- The Global Catalog is partitioned by owner identity. `CatalogAccessProvider` scopes React Query keys by principal, selected `mine`/`shared` view, filters and owner selection; the client does not send a Workspace header.
- Owners can grant label-scoped Viewer or Editor access directly to users. Anonymous Viewer links use the dedicated public-share flow.
- Server CRUD, canonical multipart inventory import, application labels and deployment-specific updates use the versioned `/api/v1` contracts.
- Dependency nodes use `PortMappingId` as deployment identity. Canvas layout is persisted through `/api/v1/topology/state`.
- Inventory and graph exports escape spreadsheet formula prefixes and multi-ID exports use repeated `ids` query parameters.
- Inventory, Topology, Dependency Manager, Bulk Import and SheetJS-heavy export paths are lazy-loaded.

See [API contracts](./docs/API.md), [architecture](./docs/ARCHITECTURE.md), and the [Phase 3–8 remediation summary](./docs/FRONTEND_REMEDIATION_PHASES_3_8.md).

## Local commands

Use the existing `.env` values supplied for the environment; do not commit secrets or replace configured ports.

```powershell
npm.cmd install
npm.cmd run dev
```

Verification:

```powershell
npm.cmd run test:ci
npm.cmd run typecheck
npm.cmd run build
npm.cmd run sync-api:check
```

CI uploads the Vitest JUnit report and command logs on every run. Docker image publication depends on the complete test, typecheck, pinned-contract and production-build gate.

## Generated API contract

`src/shared/api/v1-contract.ts` is generated from `contracts/openapi/auditnode-api-v1.json`. Its metadata pins the exact backend commit and SHA-256 checksum. Run `npm.cmd run sync-api:check` to verify the checksum, generate twice and fail if output is non-deterministic or differs from the checked-in contract. To update it, generate a new artifact from an exact reviewed backend commit, run `npm.cmd run sync-api:safe -- <artifact-path>`, and update both committed artifact and metadata in the same change. CI never fetches a live OpenAPI URL.
