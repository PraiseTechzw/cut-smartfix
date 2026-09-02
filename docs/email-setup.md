# Supabase Confirmation Email

The student mobile app expects a six-digit signup OTP and verifies it with Supabase Auth using `type: "signup"`.

1. Open Supabase Dashboard → Authentication → Email Templates → **Confirm signup**.
2. Replace the template with the contents of `docs/supabase-confirmation-email.html`.
3. Keep `{{ .Token }}` unchanged. Supabase replaces it with the six-digit confirmation code.
4. Keep `{{ .ConfirmationURL }}` unchanged as the fallback button link.
5. Set the Site URL and redirect URLs to the student app deep-link scheme configured in `apps/student-mobile/app.json`.
6. Ensure email confirmations are enabled under Authentication → Providers → Email.

The code is entered at the mobile verification screen. The app calls Supabase `/auth/v1/verify` with the pending email, `type: "signup"`, and the six-digit token. The template does not send or expose passwords.
