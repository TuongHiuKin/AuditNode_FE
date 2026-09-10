# Frontend testing and quality signals

## Local verification

Fast browser-independent tests:

    npm run test:ci

Coverage evidence:

    npm run test:coverage

Required frontend verification also includes npm run typecheck, npm run sync-api:check, and npm run build. Full-stack Playwright uses the Docker Compose stack under e2e/stack so PostgreSQL, Keycloak, two backend processes, the frontend, and the browser run together.

Coverage produces LCOV and a JSON summary. It is a diagnostic signal, not a percentage target. Generated API contracts and test files are excluded from product coverage.

## Sonar configuration

Sonar analysis is disabled by default. Enable it with these repository settings:

- Variable SONAR_ENABLED=true
- Variable SONAR_HOST_URL
- Variable SONAR_PROJECT_KEY
- Optional variable SONAR_ORGANIZATION for SonarCloud
- Secret SONAR_TOKEN

The workflow supports SonarQube Server and SonarCloud. When enabled, it analyzes only after Vitest, type checking, OpenAPI verification, and the production build succeed, and it waits for the server-side quality gate.

Initial server-side policy:

- New blocker issues: zero
- New critical issues: zero
- Security hotspots: review required
- Coverage and duplication: report only until a stable baseline exists

## Release contract evidence

The pinned release workflow captures OpenAPI from the exact backend SHA exercised by Docker full-stack E2E. It binds the artifact to that SHA with checksum metadata, verifies frontend generation, and compares it with the explicitly selected previous frontend release baseline.

OpenAPI breaking-change analysis is report-only in Phase 5. It must not become blocking until false positives are calibrated and the independent-release compatibility policy is approved.
