# CUT SmartFix

Campus maintenance and facilities management for Chinhoyi University of Technology.

## Workspace

- `apps/student-mobile`: React Native + Expo student experience
- `apps/staff-portal`: Next.js maintenance staff portal
- `apps/admin-portal`: Next.js administrator dashboard
- `services/api`: shared secure REST API
- `packages/contracts`: shared API/domain types
- `packages/api-client`: typed clients used by all applications

Supabase provides centralized PostgreSQL, authentication, file storage, and realtime primitives. Applications access business data through the API service rather than connecting directly to the database.

## Getting started

1. Install Node.js 20+ and pnpm 10+.
2. Copy each `.env.example` to `.env.local` or `.env`.
3. Add Supabase and API values.
4. Run `pnpm install`.
5. Start everything with `pnpm dev`.

See `docs/architecture.md` for boundaries and the initial module map.
