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

## 4. ⚠️ MAIN BRANCH PROTECTION RULES (STRICT BRANCHING & ANTI-FORCE POLICY)

To ensure absolute system safety and prevent source code conflicts, you MUST strictly adhere to the following rules when performing Git operations:

1. **No Direct Push to `main`:** - NEVER use commands like `git push origin main` or `git push origin master`. The `main` branch only accepts code via Pull Requests/Merge Requests after proper review.
   
2. **Always Use Isolated Branches:** - All changes must be pushed to a fresh branch (automatically created via `git checkout -b <new-branch-name>`).

3. **Absolute Prohibition of Push Force:** - DO NOT use the `-f` or `--force` flags when pushing to the `main` branch (`git push origin main --force`). This action destroys the project's commit history and breaks the synchronization flow for other team members.

4. **Mandatory Pre-Push Testing:** - Before pushing any code, you MUST run all project tests to ensure no regressions are introduced. Only push the code if all tests pass.

*Note: Read and follow this file before initiating any code modification or generation task in this workspace.*
