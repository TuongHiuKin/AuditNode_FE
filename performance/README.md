# AuditNode performance baseline

This Phase 6 suite is a Docker-only, synthetic, report-oriented baseline. It creates 10 owners, 6,000 servers, 4,000 applications, 100 labels, 200 user grants, and 20 anonymous grants in the disposable E2E PostgreSQL database.

Profiles:

- `smoke`: five catalog VUs for 60 seconds plus a rate-limit-safe anonymous probe.
- `baseline`: ramp to 20 catalog VUs, hold for five minutes, then ramp down.
- `stress`: manual discovery only; ramp from 20 to 50 VUs and hold for three minutes.

Latency remains report-only during the initial baseline. The only failing thresholds protect fixture/HTTP correctness and cross-owner disclosure. The anonymous rate stays below the configured API fixed-window limit and is not intended to determine endpoint capacity. The synthetic Keycloak realm alone receives a 15-minute access-token lifetime so the 6.5-minute baseline is not polluted by token expiry.

Run the base E2E Compose file first and this overlay second. Supply the same synthetic E2E variables used by the full-stack suite and set `PERF_PROFILE`. Start `performance-verify` detached, wait for its container, and require exit code zero before load begins. Then run `k6` with `docker compose run --no-deps --rm k6`, followed by `performance-db-report` with the same flags. Using `--no-deps` is important because the fixture must be seeded and verified exactly once per measurement. Always tear down the exact Compose project with `--profile performance down --volumes --remove-orphans`.

The manual GitHub workflow reads the backend repository from the `AUDITNODE_BACKEND_REPOSITORY` repository variable and requires an exact 40-character backend SHA. Artifacts contain a sanitized k6 summary, PostgreSQL query statistics, before/after Docker resource snapshots, and an exact-source manifest. Access tokens and anonymous link tokens must never be uploaded.

Do not point this suite at staging or production. Do not convert the proposed p95 values into gates until at least three comparable runs exist on a stable runner and the SLO is explicitly approved.
