# AuditNode Frontend — Codex Guidance

At the beginning of every prompt, read and follow `.codex/BEHAVIOR.md`. It selects applicable skills automatically from `../agent-standards/manifest.json`; do not require the user to invoke a skill explicitly.

For a cross-application task, follow each project's root `AGENTS.md` and update the frontend contract only after the backend contract is defined.

- Read `design.md` before changing visual components.
- Reuse `src/shared/ui/` components when they meet the required behavior and accessibility.
- Run `npx tsc --noEmit`, `npx vitest run`, and `npm run build` before reporting frontend changes complete.
