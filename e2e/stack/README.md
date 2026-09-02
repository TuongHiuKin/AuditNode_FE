# AuditNode E2E stack

This stack boots PostgreSQL, Keycloak, a one-shot EF Core migration runner, Backend, and Frontend. The initializer uses the same `--migrate-only` path as production, so a clean E2E startup verifies the retained migration chain rather than bypassing it with `EnsureCreated`. The stack intentionally has no credential defaults and reads every credential from the calling process environment; do not create or commit an `.env` file.

Set all variables referenced with `${...:?set ...}` in `docker-compose.yml`, then run:

```text
npm run e2e:config
docker compose -f e2e/stack/docker-compose.yml up --build -d
docker compose -f e2e/stack/docker-compose.yml wait backend-peer-ready frontend-ready
E2E_EXTERNAL_STACK=1 E2E_FRONTEND_URL=http://localhost:15173 E2E_BACKEND_URL=http://localhost:15000 E2E_KEYCLOAK_URL=http://localhost:18080 npm run test:e2e
```

The bootstrap reconciles an existing realm, clients, and users, then idempotently creates two owner catalogs, same-named Business Labels, private/shared resources, and Viewer/Editor Label Grants through application APIs. The legacy environment-variable names are retained only to avoid credential migration; they no longer imply Workspace or Auditor roles. The frontend uses a same-origin Vite proxy, so both host-run and Compose-run Playwright browsers reach the backend without container-local `localhost` assumptions. External-stack tests are forced to one worker because the grant upgrade/revoke/restore contract mutates shared fixture state.

The migration runner upgrades volumes that already have a valid EF migration history, and the readiness chain verifies the owner-scoped topology/dependency views created by migrations. A volume created by the former Workspace initializer is not a valid Phase 9 fixture; recreate only the named E2E project volume after confirming its exact target. For release evidence, run against a fresh project volume so the complete migration history is exercised.

Published ports bind only to loopback. Override `E2E_POSTGRES_PORT`, `E2E_KEYCLOAK_PORT`, `E2E_BACKEND_PORT`, `E2E_BACKEND_PEER_PORT`, or `E2E_FRONTEND_PORT` when the defaults `15432`, `18080`, `15000`, `15001`, and `15173` conflict. The PostgreSQL binding exists for the opt-in `AUDITNODE_TEST_POSTGRES` advisory-lock integration tests and must not be exposed beyond loopback. The peer backend shares PostgreSQL and Keycloak with the primary backend so Playwright can verify the last-SystemAdmin invariant across API processes. Container images use explicit version tags; digest pinning remains a supply-chain hardening follow-up because verified registry digests are not stored in this repository.
