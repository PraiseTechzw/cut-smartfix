# First Administrator Setup

The admin and staff portals do not offer public registration. Create the first administrator once from a trusted local development machine. This command uses the API's Supabase service-role credential, sets the administrator role in protected app metadata, and lets the database trigger create the matching profile.

## Before running it

1. Apply all Supabase migrations to the project you intend to use.
2. Copy `services/api/.env.example` to `services/api/.env` and set that project's `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. Make sure the admin portal's Supabase URL and API URL point to the same project and API.

## Create the first administrator

From the repository root, run these commands in Bash. The password is read without displaying it, and is removed from the shell environment after the command finishes.

```bash
read -r -p "Administrator email: " BOOTSTRAP_ADMIN_EMAIL
read -r -p "Administrator full name: " BOOTSTRAP_ADMIN_NAME
read -r -s -p "Temporary password (at least 8 characters): " BOOTSTRAP_ADMIN_PASSWORD
printf '\n'
export BOOTSTRAP_ADMIN_EMAIL BOOTSTRAP_ADMIN_NAME BOOTSTRAP_ADMIN_PASSWORD
pnpm --filter @cut-smartfix/api bootstrap-admin
unset BOOTSTRAP_ADMIN_EMAIL BOOTSTRAP_ADMIN_NAME BOOTSTRAP_ADMIN_PASSWORD
```

The bootstrap command only runs when no administrator profile exists. It creates a confirmed Auth account and its administrator profile. Sign in to the Admin Portal with the email and password entered above. Once signed in, use **Staff** to provision other staff accounts. Change the temporary password after first sign-in if it was shared or entered on a shared machine.

Keep `SUPABASE_SERVICE_ROLE_KEY` in `services/api/.env` or the API host's secret environment only. Never add it to either portal's environment.
