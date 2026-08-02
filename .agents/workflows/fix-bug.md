# Workflow: fix-bug

Run this whenever the user reports a bug. Do not just start editing code.

1. Ask for (or confirm) the exact symptom and how to reproduce it.
2. Investigate and explain the actual root cause before proposing any fix.
3. Propose the smallest possible change that would fix it.
4. List every file that change would touch.
5. Wait for user/Artifact approval before applying the fix.
6. Do not modify any file outside what's needed for this fix — no
   unrelated "improvements" bundled in.
7. If a background/parallel agent is active on another task, do not let
   this fix touch its files.
8. After applying the fix, use the Browser Subagent to verify the bug is
   resolved and nothing else broke.
9. Summarize the change in an Artifact (diff-style, not full files).
