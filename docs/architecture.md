# Architecture

## Runtime boundaries

The Expo student app, staff portal, and admin portal are separate clients. They share `packages/contracts` and `packages/api-client`, but all authenticated business operations go through `services/api`.

The API validates Supabase JWTs, enforces role permissions, writes audit events, and uses the Supabase service role only on the server. Never expose `SUPABASE_SERVICE_ROLE_KEY` to a client app.

## Initial modules

### Student mobile

Authentication, dashboard, report issue, my reports, report tracking, notifications, feedback, profile, and offline sync queue.

### Staff portal

Dashboard, my tasks, task details, work updates, material requests, repair evidence, and completed jobs.

### Administrator portal

Dashboard, maintenance requests, assignments, staff management, buildings, rooms, categories, departments, analytics, reports, and audit logs.

## API resource direction

`/health`, `/v1/me`, `/v1/reports`, `/v1/reports/:id/timeline`, `/v1/tasks`, `/v1/catalog`, `/v1/notifications`, `/v1/feedback`, and `/v1/admin/*`.
