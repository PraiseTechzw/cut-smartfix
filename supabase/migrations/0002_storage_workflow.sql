create table report_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references maintenance_reports(id) on delete cascade,
  uploaded_by uuid not null references profiles(id),
  storage_path text not null unique,
  file_name text not null,
  content_type text not null,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  report_id uuid references maintenance_reports(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table report_feedback (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references maintenance_reports(id) on delete cascade,
  submitted_by uuid not null references profiles(id),
  resolved boolean not null,
  rating smallint check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 2000),
  created_at timestamptz not null default now()
);

create index report_attachments_report_idx on report_attachments(report_id, created_at);
create index notifications_user_idx on notifications(user_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('maintenance-evidence', 'maintenance-evidence', false)
on conflict (id) do nothing;

alter table report_attachments enable row level security;
alter table notifications enable row level security;
alter table report_feedback enable row level security;

create policy attachments_reporter_read on report_attachments for select using (
  exists (select 1 from maintenance_reports r where r.id = report_id and r.reporter_id = auth.uid())
);
create policy notifications_self_read on notifications for select using (user_id = auth.uid());
create policy notifications_self_update on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy feedback_reporter_manage on report_feedback for all using (submitted_by = auth.uid()) with check (submitted_by = auth.uid());

create policy evidence_reporter_read on storage.objects for select using (
  bucket_id = 'maintenance-evidence' and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function record_report_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status then
    insert into report_timeline (report_id, status, created_by)
    values (new.id, new.status, coalesce(new.assigned_to, new.reporter_id));
    insert into notifications (user_id, report_id, title, body)
    values (new.reporter_id, new.id, 'Maintenance report updated', 'Ticket ' || new.ticket_number || ' is now ' || replace(new.status::text, '_', ' ') || '.');
  end if;
  return new;
end;
$$;

create trigger maintenance_report_status_change
after update of status on maintenance_reports
for each row execute function record_report_status_change();
