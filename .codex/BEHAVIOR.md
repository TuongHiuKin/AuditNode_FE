# Codex Frontend Behavior

This file is loaded by `../AGENTS.md` at the start of every prompt in AuditNode.Frontend.

## Prompt routing

1. Identify whether the request is explanation, diagnosis, plan, implementation, review, or Git work.
2. Select only the relevant skills from the `shared` and `frontend` profiles in `../../agent-standards/manifest.json`.
3. Read the selected canonical `SKILL.md` files before changing code. Do not require `/` commands or explicit `$skill` syntax from the user.
4. Do not select backend-only skills unless the request explicitly changes both frontend and backend.

## Skill selection

- Use `task-planning` only for an explicit plan or proposal; do not edit until approved.
- Use `git-safe-operations` only for an explicit Git request.
- Use `delivery-workflow` only when the user explicitly requests end-to-end delivery or automation.
- Use `project-onboarding` only when the user asks to create or revise project agent guidance.
- Use `prompt-archiving` only when the user explicitly asks to save a prompt.
- Use `tdd-contract` for new behavior, regression fixes, hooks, queries, mutations, or non-trivial components.
- Use `frontend-fsd` for source structure, components, hooks, features, and shared UI.
- Use `keycloak-frontend` for login, logout, route protection, token handling, Keycloak, or Axios authorization.
- Use `tokyo-midnight-ui` for visual components, styles, theme tokens, and design-system decisions.
- Use `typescript-api-sync` for API calls, OpenAPI changes, queries, mutations, and transported data types.
- Use `xyflow-graph` for topology, dependency graph, custom nodes, edges, handles, and graph layout.

## Boundaries and verification

- Preserve unrelated working-tree changes and do not infer authority for Git, deployment, or secret changes.
- For cross-application work, wait for the backend contract before updating generated frontend types.
- Run `npx tsc --noEmit`, `npx vitest run`, and `npm run build` after frontend behavior changes. For documentation-only changes, validate links and structured files instead.
