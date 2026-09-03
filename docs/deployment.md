# Backend Deployment

The API should be deployed to a public HTTPS host before testing on physical phones. This repository includes `render.yaml` for a Render web service.

## Deploy on Render

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint** and select the repository.
3. Render reads `render.yaml` and creates `cut-smartfix-api`.
4. Add these secret environment values in the Render service:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CORS_ALLOW_ALL=true` for development or `false` in production
   - `CORS_ORIGINS` with deployed staff/admin origins, comma-separated, when allow-all is false
5. Deploy and open the generated URL, for example `https://cut-smartfix-api.onrender.com/health`.
6. Confirm the response has `status: ok` and `supabaseConfigured: true`.

The service uses the repository lockfile, builds the API and shared contracts, starts on Render's `PORT`, and exposes `/health` for health checks.

## Apply Supabase migrations

Run this from a machine authenticated to the target Supabase project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Apply migrations in order. Do not manually paste service-role keys into source files or client environment files.

## Connect clients

After deployment, update the public API URL in each client environment:

```env
EXPO_PUBLIC_API_URL=https://cut-smartfix-api.onrender.com
NEXT_PUBLIC_API_URL=https://cut-smartfix-api.onrender.com
```

The web portal templates are `apps/staff-portal/.env.example` and `apps/admin-portal/.env.example`. Set the Supabase public URL and anon key in those portals for browser login; never put the API service-role key in either one.

The Expo value is compiled into the app. Restart Expo after changing it and rebuild the app for a release build. For Expo Go, clear the Metro cache if it still uses the old value.

## Local verification

```bash
curl https://cut-smartfix-api.onrender.com/health
pnpm --filter @cut-smartfix/api typecheck
```

## Production notes

- Use a paid or always-on service for reliable institutional availability; free Render services may sleep.
- Native Expo requests are not blocked by browser CORS. Use `CORS_ALLOW_ALL=true` for development across changing LAN IPs; use `false` plus exact deployed web origins in production.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in Render server environment variables.
- Configure a custom API domain and HTTPS before distributing the mobile app widely.
