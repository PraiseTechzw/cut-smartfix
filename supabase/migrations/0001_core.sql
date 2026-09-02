create extension if not exists pgcrypto;

create type user_role as enum ('student', 'technician', 'supervisor', 'administrator');
create type report_status as enum ('submitted', 'reviewed', 'assigned', 'in_progress', 'completed', 'reopened', 'closed');
create type urgency_level as enum ('low', 'normal', 'high', 'emergency');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role user_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table maintenance_reports (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique default ('CUT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  reporter_id uuid not null references profiles(id),
  assigned_to uuid references profiles(id),
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 10 and 5000),
  status report_status not null default 'submitted',
  urgency urgency_level not null default 'normal',
  location jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table report_timeline (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references maintenance_reports(id) on delete cascade,
  status report_status not null,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index maintenance_reports_reporter_idx on maintenance_reports(reporter_id, created_at desc);
create index maintenance_reports_assigned_idx on maintenance_reports(assigned_to, status);
create index report_timeline_report_idx on report_timeline(report_id, created_at);

create or replace function add_initial_report_timeline()
returns trigger language plpgsql as $$
begin
  insert into report_timeline (report_id, status, created_by)
  values (new.id, new.status, new.reporter_id);
  return new;
end;
$$;

create trigger maintenance_report_timeline_after_insert
after insert on maintenance_reports
for each row execute function add_initial_report_timeline();

alter table profiles enable row level security;
alter table maintenance_reports enable row level security;
alter table report_timeline enable row level security;

create policy profiles_self_read on profiles for select using (id = auth.uid());
create policy reports_student_read on maintenance_reports for select using (reporter_id = auth.uid());
create policy reports_student_insert on maintenance_reports for insert with check (reporter_id = auth.uid());
create policy timeline_reporter_read on report_timeline for select using (
  exists (select 1 from maintenance_reports r where r.id = report_id and r.reporter_id = auth.uid())
);
