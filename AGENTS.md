# Project Agent Rules

These rules apply to every agent task in this workspace. Follow them
automatically — do not wait to be asked.

## Scope discipline
- Never build beyond the agreed plan for this project. If a task seems to
  require expanding scope, pause and flag it in the task Artifact instead
  of building it automatically.
- Keep each task bounded to a single feature or fix. Do not bundle multiple
  unrelated features into one task.
- Do not modify files outside the current task's scope. If you believe you
  need to, stop and explain why before proceeding.

## Code quality
- Default to the simplest correct implementation. Do not add abstractions,
  dependencies, or "best practice" scaffolding the current task doesn't
  need.
- Before marking any task complete, review your own output for anything
  unnecessary or overly complex, and simplify it.

## Security (non-negotiable, every task)
- Never hardcode secrets or credentials — use environment variables.
- Validate all user input server-side, not just client-side.
- Every protected route must check authentication AND authorization.
- Avoid SQL/NoSQL injection risk — use parameterized queries / ORM.
- Never leak stack traces or internal error details to the client.
- Add rate limiting to sensitive endpoints (login, signup, etc.).

## Testing & verification
- Use the Browser Subagent to actually test any feature involving UI or
  user-facing behavior before marking a task complete.
- Produce an Artifact summarizing what was built, which files were
  touched, and why — for every task.

## Bug fixes
- When fixing a bug, first explain the root cause and the smallest
  possible fix. Do not touch unrelated files "just in case."
- Wait for approval on the Artifact before applying fixes to already
  -working features.

## Parallel/background agents
- When spawning a parallel agent, constrain it explicitly to specific
  files/folders. Report back with an Artifact (diff + test results)
  before merging — never auto-merge.
