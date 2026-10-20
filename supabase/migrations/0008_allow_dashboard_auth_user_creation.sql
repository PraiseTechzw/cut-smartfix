-- Allow Supabase Auth dashboard and server-provisioned users to be created
-- without student metadata. Public student registration still collects and
-- validates student IDs in the client/API flow.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_role_value user_role := coalesce(new.raw_app_meta_data->>'role', 'student')::user_role;
  student_id_value text := nullif(trim(new.raw_user_meta_data->>'student_id'), '');
  department_id_value uuid := nullif(new.raw_user_meta_data->>'department_id', '')::uuid;
begin
  insert into public.profiles (id, full_name, email, role, student_id, department_id)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    user_role_value,
    student_id_value,
    department_id_value
  );
  return new;
end;
$$;
