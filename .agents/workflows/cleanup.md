# Workflow: cleanup

Run this periodically (e.g. every few features) or when the user asks for
a cleanup pass.

1. Review the specified file/feature/module (or the most recently built
   features if unspecified).
2. Identify anything unused, redundant, or more complex than necessary.
3. Propose removals/simplifications with reasoning for each one.
4. Wait for approval, then apply the changes.
5. Use the Browser Subagent to verify nothing broke as a result.
6. Summarize what was removed and why in an Artifact.
