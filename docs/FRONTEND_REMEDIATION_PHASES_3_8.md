# Frontend Remediation Summary — Phases 3–8

## Delivered

- Phase 3: backend auth gateway integration, custom Login/Register UI, memory-only access token, `HttpOnly` refresh cookie bootstrap, single-flight `401` refresh, protected-route wait state and terminal cache cleanup.
- Phase 4: authenticated workspace loading and selection, valid workspace header rules, workspace-scoped React Query keys and cache isolation.
- Phase 5: canonical server CRUD and multipart inventory import through the standard API client.
- Phase 6: application labels, label filtering, deployment-aware create/update/migrate flows and explicit `PortMappingId` selection.
- Phase 7: deployment-identity XYFlow nodes, validated dependencies, canonical topology state persistence, stable edges and removal of global graph session persistence.
- Phase 8: repeated multi-ID export parameters, exact datacenter/deployment/label mapping, spreadsheet formula escaping, workspace-aware exports and lazy route/XLSX loading.

## Verification snapshot

- Focused Phase 8 tests: 23 passed.
- Full frontend suite: 40 files, 151 tests passed.
- TypeScript: `npx.cmd tsc --noEmit` passed.
- Production: `npm.cmd run build` passed.
- Main JavaScript chunk: 1,256.38 kB before lazy loading; 400.01 kB after.

## OpenAPI follow-up

The generated contract remains unchanged. Regeneration was attempted three times but the local API could not remain available because of DataProtection/EventLog behavior in the current PowerShell environment. No TLS bypass or insecure workaround was used. Regenerate when the backend can run deterministically, then replace the focused exact local transport types with generated equivalents.
