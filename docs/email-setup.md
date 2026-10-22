# Supabase Authentication Email Templates

The student app currently supports signup email verification with a six-digit code. It does not currently implement password recovery, so there is no working password reset email template to configure yet.

## Student email verification

1. In Supabase Dashboard, open **Authentication → Email Templates → Confirm signup**.
2. Set the subject to `Verify your CUT SmartFix student account`.
3. Paste the contents of [`supabase-confirmation-email.html`](supabase-confirmation-email.html) into the message editor.
4. Keep `{{ .Token }}` unchanged. Supabase replaces it with the six-digit code.

## Email settings

- Ensure email confirmations are enabled under **Authentication → Providers → Email**.
- The signup screen verifies the entered code with Supabase Auth using `type: "signup"`.
- The email templates never include or ask for a password.
- Do not configure a password reset email for the student app until a recovery flow is implemented in the app.
