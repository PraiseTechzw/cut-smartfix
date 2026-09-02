-- Keep public sign-up roles at student. Staff roles must be provisioned through
-- the server using Supabase app_metadata, which clients cannot write.
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
  if user_role_value = 'student' and student_id_value is null then
    raise exception 'student_id is required for student accounts';
  end if;

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

-- Recreate the trigger idempotently for environments where 0004 was edited
-- or applied with the previous raw metadata role behavior.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create unique index if not exists profiles_student_id_unique
  on public.profiles (lower(student_id))
  where student_id is not null;
