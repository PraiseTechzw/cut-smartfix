import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const fullName = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

function fail(message: string): never {
  console.error(`Admin bootstrap failed: ${message}`);
  process.exit(1);
}

if (!supabaseUrl || !serviceRoleKey) {
  fail("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in services/api/.env.");
}
if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  fail("Set BOOTSTRAP_ADMIN_EMAIL to a valid email address.");
}
if (!fullName || fullName.length < 2) {
  fail("Set BOOTSTRAP_ADMIN_NAME to the administrator's full name.");
}
if (!password || password.length < 8) {
  fail("Set BOOTSTRAP_ADMIN_PASSWORD to a password of at least 8 characters.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: admins, error: lookupError } = await supabase
  .from("profiles")
  .select("id")
  .eq("role", "administrator")
  .limit(1);

if (lookupError) fail(`Could not check existing administrators: ${lookupError.message}`);
if (admins.length > 0) {
  fail("An administrator already exists. Sign in with that account and provision additional users in the portal.");
}

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
  app_metadata: { role: "administrator", provisioned_by: "bootstrap" },
});

if (error || !data.user) {
  fail(error?.message ?? "Supabase did not return the created user.");
}

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id, email, role")
  .eq("id", data.user.id)
  .maybeSingle();

if (profileError || profile?.role !== "administrator") {
  fail(profileError?.message ?? "The Auth account was created, but its administrator profile was not provisioned. Check that all migrations are applied.");
}

console.log(`Created administrator ${profile.email} (${profile.id}). You can now sign in to the Admin Portal.`);
