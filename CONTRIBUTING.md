# Contributing

## Development flow

1. Create a focused branch from the current default branch.
2. Make the smallest change that completes the issue.
3. Run `pnpm typecheck` and the relevant app build.
4. Update documentation when behavior, routes, environment variables, or migrations change.
5. Open a pull request with testing notes and screenshots for UI changes.

## Conventions

- Keep business rules in the API and database, not only in client components.
- Use shared types from `@cut-smartfix/contracts` for cross-app data.
- Keep Supabase service-role access inside `services/api`.
- Add migrations instead of editing migrations already applied to shared environments.
- Preserve role-based access and audit logging for administrative actions.
- Avoid committing `.env` files, tokens, or private user data.

## Pull requests

Include the user-facing behavior, affected apps/packages, migration requirements, and commands run. UI changes should include before/after screenshots where useful.
