# Backend

The API is an Express TypeScript service in `services/api`. Clients authenticate with Supabase Auth and send the Supabase access token as `Authorization: Bearer <token>`. The API verifies the token, loads the user's profile and role, and uses the Supabase service-role client for server-side data access.

## Routes

- `GET /health`
- `GET /v1/me`
- `GET /v1/reports`
- `POST /v1/reports`
- `GET /v1/reports/:id`
- `GET /v1/reports/:id/timeline`
- `POST /v1/reports/:id/attachments/sign`
- `POST /v1/reports/:id/feedback`
- `GET /v1/notifications`
- `PATCH /v1/notifications/:id/read`
- `GET /v1/tasks` for technicians, supervisors, and administrators
- `PATCH /v1/tasks/:id` for technicians, supervisors, and administrators

Attachments use private Supabase Storage. The API creates a short-lived signed upload URL and records metadata; clients upload directly with the returned token. The service-role key must only exist in the API environment, never in Expo or Next.js client bundles.

## Database

Apply migrations in order with the Supabase CLI:

```bash
supabase db push
```

`0001_core.sql` creates profiles, reports, report timelines, roles, status types, indexes, and baseline RLS. `0002_storage_workflow.sql` adds attachments, notifications, feedback, the private storage bucket, storage policies, and status-change triggers.

Set these API variables from `services/api/.env.example`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_BUCKET`, `CORS_ORIGINS`, and `PORT`.
