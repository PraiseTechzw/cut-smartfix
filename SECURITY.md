# Security Policy

## Reporting a vulnerability

Do not open a public issue for a security vulnerability. Contact the CUT SmartFix maintainers privately with a description, reproduction steps, affected route or migration, and impact.

## Security requirements

- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- Use Supabase Auth access tokens in the `Authorization: Bearer` header.
- Enforce permissions in the REST API and PostgreSQL RLS policies.
- Store evidence in private Supabase Storage buckets and use signed URLs.
- Apply migrations in order and review policy changes before production deployment.
- Rotate any secret that has been exposed or committed.
