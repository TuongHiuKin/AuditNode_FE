# AuditNode E2E stack

This stack boots PostgreSQL, Keycloak, a one-shot EF Core migration runner, required PostgreSQL views, Backend, and Frontend. The initializer uses the same `--migrate-only` path as production, so a clean E2E startup verifies the retained migration chain rather than bypassing it with `EnsureCreated`. The stack intentionally has no credential defaults and reads every credential from the calling process environment; do not create or commit an `.env` file.

Set all variables referenced with `${...:?set ...}` in `docker-compose.yml`, then run:

```text
npm run e2e:config
docker compose -f e2e/stack/docker-compose.yml up --build --wait
E2E_EXTERNAL_STACK=1 E2E_FRONTEND_URL=http://localhost:15173 E2E_BACKEND_URL=http://localhost:15000 E2E_KEYCLOAK_URL=http://localhost:18080 npm run test:e2e
```

The bootstrap reconciles an existing realm, clients, users and roles, then idempotently creates the owner workspace plus label/frame/dependency fixtures through application APIs. The frontend uses a same-origin Vite proxy, so both host-run and Compose-run Playwright browsers reach the backend without container-local `localhost` assumptions. External-stack tests are forced to one worker because the revoke/restore contract mutates shared fixture state.

The migration runner upgrades volumes that already have a valid EF migration history, and the readiness chain also verifies the required views. A Phase 3 volume created by the former `EnsureCreated` initializer has no adoption history and intentionally fails closed; remove only the `auditnode-e2e_postgres-data` test volume and rebuild it. For release evidence, run against a fresh project volume so the complete migration history is exercised. The Phase 7 graph-command scenario is explicitly skipped until that API exists.

Published ports bind only to loopback. Override `E2E_KEYCLOAK_PORT`, `E2E_BACKEND_PORT`, or `E2E_FRONTEND_PORT` when the defaults `18080`, `15000`, and `15173` conflict. Container images use explicit version tags; digest pinning remains a supply-chain hardening follow-up because verified registry digests are not stored in this repository.
