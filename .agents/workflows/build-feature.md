# Workflow: build-feature

Run this for each individual feature task, one at a time.

1. Confirm the specific feature in scope for this task (from the approved
   plan). Do not build anything beyond it.
2. Implement the simplest correct version — no extra abstraction or
   dependencies not required for this feature.
3. Validate all input server-side.
4. If this feature involves UI or user-facing behavior, use the Browser
   Subagent to actually test it before marking the task complete.
5. Produce an Artifact summarizing:
   - What was built
   - Which files were changed and why
   - Any security-relevant decisions made (hashing, rate limiting, etc.)
6. If you believe you need to touch files outside this feature's scope,
   stop and flag it in the Artifact instead of proceeding.
7. Do not mark the task complete without the Artifact. Wait for user
   approval before starting the next task.
