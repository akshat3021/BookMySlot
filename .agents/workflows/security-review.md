# Workflow: security-review

Run this after every feature task, before approving its Artifact, and
again as a full pass before launch.

Check the relevant code for:
1. Hardcoded secrets or credentials
2. Missing input validation on any endpoint
3. Missing auth/permission checks on protected routes
4. SQL/NoSQL injection risk
5. Error messages leaking internal details to the client
6. Missing rate limiting on sensitive endpoints (login, signup, etc.)
7. Overly permissive CORS settings
8. Dependencies with known high/critical vulnerabilities

For each issue found:
- Explain what's wrong and why it matters
- Fix it
- Re-verify with the Browser Subagent if the fix affects user-facing
  behavior

Report a clear pass/fail summary as an Artifact before the task or
release is approved.
