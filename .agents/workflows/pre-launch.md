# Workflow: pre-launch

Run this before deploying the project publicly for the first time, or
before any major release.

Go through each item below, check the actual code (not just assume), and
report pass/fail with fixes for anything that fails:

1. All secrets in environment variables, none hardcoded
2. `.env` excluded from version control (`.gitignore`)
3. Every protected route checks authentication AND authorization
4. All user input validated server-side
5. Passwords hashed properly (bcrypt/argon2, not plaintext or weak hashing)
6. Rate limiting on login/signup/expensive endpoints
7. Error responses don't leak stack traces or internal details
8. No known high/critical vulnerabilities in dependencies (run an audit)
9. CORS locked to the actual production domain, not wide open
10. A backup/recovery plan exists for the database

Use the Browser Subagent to verify functional behavior for each
security-relevant flow (login, protected pages, form submission).

Produce a final Artifact with the full pass/fail report. Do not consider
the project launch-ready until every item passes.
