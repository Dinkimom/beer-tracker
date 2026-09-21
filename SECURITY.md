# Security Policy

## Supported versions

Security fixes are accepted against the current `main` branch (and the latest
released tag when tags are published).

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Prefer one of:

1. **GitHub Private Vulnerability Reporting** (Security → Report a vulnerability),
   if enabled on the repository.
2. Email the maintainers privately (use the contact listed in the GitHub org /
   repository profile, or open a private channel with a maintainer).

Include:

- description of the issue and impact;
- steps to reproduce or a proof of concept;
- affected version / commit if known.

We aim to acknowledge reports within a few business days and to coordinate a fix
before any public disclosure.

## Scope notes (self-hosted)

- User OAuth / tracker tokens are intended to stay in the browser where the
  product design allows; treat server-side secrets (`AUTH_SESSION_SECRET`,
  `ORG_SECRETS_ENCRYPTION_KEY`, `SYNC_CRON_SECRET`, `SPRINT_CONTEXT_MCP_SECRET`,
  DB and S3 credentials) as highly sensitive in your deployment.
- Do not commit `.env`, helm `*-secrets` overlays, or production credentials.
