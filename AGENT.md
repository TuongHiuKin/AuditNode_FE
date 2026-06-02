# AI Agent System Instructions & Rules

## 1. Strict TDD Contract (Test-Driven Development)
- For every new feature, API controller, core application service, backend logic, or frontend UI component that you generate, you MUST simultaneously create a corresponding Unit Test file containing active assertions.
- Tasks are considered incomplete if functional code is written without accompanying tests (xUnit/FluentAssertions for Backend, Vitest/React Testing Library for Frontend).

## 2. Automated Prompt Archiving Contract
- Monitor the conversation for user confirmation keywords such as 'Confirm', 'Save prompt', or 'Approved'.
- Upon detecting these keywords, you must automatically extract the core successful prompt context/structure used in that turn and append it chronologically into a log file named 'PROMPT_HISTORY.md' inside the 'docs/' directory (path: 'docs/PROMPT_HISTORY.md').

## 3. Architectural Integrity Guardrails
- **Backend:** Strictly enforce .NET Clean Architecture standards. Keep clear separation between Domain, Application, Infrastructure, and API layers.
- **Frontend:** Adhere strictly to the FSD-Lite (Feature-Driven) folder structure convention. Keep components modular and single-responsibility focused.

## 4. ⚠️ GIT OPERATIONS & PROTECTION RULES (STRICT MANUAL TRIGGER & PROTECTION)

To ensure absolute system safety and prevent unauthorized source code modifications, you MUST strictly adhere to the following rules:

1. **No Automatic Git Operations:** - DO NOT perform any Git operations (add, commit, push, branch, etc.) automatically after completing a task. You must skip all Git commands unless the user explicitly initiates the flow by typing exactly **"push code"**.

2. **Trigger-Based Workflow:** - Only when the user inputs **"push code"**, you may begin the Git workflow. This workflow MUST still follow these protection rules:
   - **No Direct Push to `main`:** NEVER push to `main` or `master`.
   - **Always Use Isolated Branches:** Create a fresh branch for changes.
   - **No Force Push:** Absolute prohibition of `-f` or `--force`.
   - **Mandatory Final Pre-Push Testing:** Immediately before the actual push (and after user confirmation), you MUST run all project tests. Only push if 100% of tests pass.

3. **Explicit User Approval for Each Step:** - Even after the "push code" trigger, you MUST ask for and receive explicit confirmation before executing the final `git push` command.

## 5. Core Rule: Continuous Documentation
- Whenever a major change is successfully implemented in the project—such as creating a new API endpoint, adding a new feature, modifying existing core logic, altering the database schema, or performing a significant UI refactor—you (the Agent) MUST automatically update the corresponding files in the `docs/` folder (e.g., `API.md`, `DATABASE.md`, `ARCHITECTURE.md`, `HISTORY.md`) and the `README.md`.
- Do not wait for explicit user prompts to update the docs. Treat documentation synchronization as the mandatory final step of any feature development or major bug fix.

*Note: Read and follow this file before initiating any code modification or generation task in this workspace.*
