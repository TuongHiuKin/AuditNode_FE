# AuditNode Frontend

React, TypeScript and Vite frontend for AuditNode inventory, topology and dependency management.

## Current architecture

- Authentication uses the backend auth gateway at `/api/v1/auth/*`. Login and registration remain custom React screens; the application does not launch the Keycloak-hosted UI.
- Access tokens are held in memory only. Refresh tokens are backend-managed `HttpOnly` cookies and refresh requests use credentials.
- The selected workspace is validated against `/api/v1/workspaces`. Tenant queries include the workspace ID in their React Query key, and the standard API client adds the workspace header only after a valid selection.
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
npx.cmd tsc --noEmit
npm.cmd run build
```

The latest Phase 8 verification completed with 40 test files and 151 tests passing. The production build split the former 1,256.38 kB main JavaScript bundle into a 400.01 kB main chunk plus lazy route and XLSX chunks.

## Generated API contract

`src/shared/api/v1-contract.ts` is generated from a pinned backend OpenAPI artifact. Run `npm.cmd run sync-api:safe -- <artifact-path>` to update it, then `npm.cmd run sync-api:check -- <artifact-path>` to generate it twice and fail if the output is non-deterministic or differs from the checked-in contract. HTTPS inputs use normal Node.js certificate verification; TLS verification must not be bypassed.
