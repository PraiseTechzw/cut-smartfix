-- ============================================================
-- Migration 0007: Data backfill and schema expansion.
--
-- Runs after 0006 has committed the new enum values.
-- Safe to use 'under_review', 'repair_completed', etc. here.
-- ============================================================

-- ─────────────────────────────────────────
-- 1. Backfill legacy status values
-- ─────────────────────────────────────────

-- 'reviewed' was the old name for 'under_review'
update maintenance_reports
  set status = 'under_review'
  where status::text = 'reviewed';

update report_timeline
  set status = 'under_review'
  where status::text = 'reviewed';

-- 'completed' was the old name for 'repair_completed'
update maintenance_reports
  set status = 'repair_completed'
  where status::text = 'completed';

update report_timeline
  set status = 'repair_completed'
  where status::text = 'completed';

-- ─────────────────────────────────────────
-- 2. Indexes for common filtered queries
-- ─────────────────────────────────────────
create index if not exists maintenance_reports_status_idx
  on maintenance_reports(status);

create index if not exists maintenance_reports_assigned_status_idx
  on maintenance_reports(assigned_to, status);

-- ─────────────────────────────────────────
-- 3. Expand maintenance_reports columns
-- ─────────────────────────────────────────
alter table maintenance_reports
  add column if not exists assigned_department_id uuid references departments(id),
  alter column status set default 'submitted';

-- ─────────────────────────────────────────
-- 4. Expand notifications columns
-- ─────────────────────────────────────────
alter table notifications
  add column if not exists ticket_number text,
  add column if not exists action_url    text,
  add column if not exists type          text not null default 'status_change';

-- ─────────────────────────────────────────
-- 5. Ensure completion_evidence table exists
-- ─────────────────────────────────────────
create table if not exists completion_evidence (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references maintenance_reports(id) on delete cascade,
  uploaded_by  uuid not null references profiles(id),
  storage_path text not null unique,
  file_name    text not null,
  content_type text not null,
  caption      text,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 6. Ensure assignments table exists
-- ─────────────────────────────────────────
create table if not exists assignments (
  id             uuid primary key default gen_random_uuid(),
  report_id      uuid not null references maintenance_reports(id) on delete cascade,
  technician_id  uuid not null references profiles(id),
  assigned_by    uuid not null references profiles(id),
  department_id  uuid references departments(id),
  status         assignment_status not null default 'assigned',
  notes          text,
  rejected_reason text,
  assigned_at    timestamptz not null default now(),
  accepted_at    timestamptz,
  completed_at   timestamptz,
  is_current     boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 7. Ensure maintenance_notes table exists
-- ─────────────────────────────────────────
create table if not exists maintenance_notes (
  id                   uuid primary key default gen_random_uuid(),
  report_id            uuid not null references maintenance_reports(id) on delete cascade,
  author_id            uuid not null references profiles(id),
  content              text not null check (char_length(content) between 1 and 5000),
  note_type            text not null default 'general'
    check (note_type in ('general', 'diagnosis', 'work_note', 'completion',
                         'verification', 'rejection', 'internal')),
  is_visible_to_student boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 8. Ensure material_requests table exists
-- ─────────────────────────────────────────
create table if not exists material_requests (
  id               uuid primary key default gen_random_uuid(),
  report_id        uuid not null references maintenance_reports(id) on delete cascade,
  requested_by     uuid not null references profiles(id),
  approved_by      uuid references profiles(id),
  material_name    text not null check (char_length(material_name) between 2 and 200),
  quantity         int  not null check (quantity > 0),
  unit             text not null default 'units',
  reason           text not null check (char_length(reason) between 5 and 1000),
  status           material_request_status not null default 'requested',
  rejection_reason text,
  requested_at     timestamptz not null default now(),
  decided_at       timestamptz,
  issued_at        timestamptz,
  received_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 9. Backfill ticket_number on notifications
-- ─────────────────────────────────────────
update notifications n
  set ticket_number = mr.ticket_number
from maintenance_reports mr
where n.report_id = mr.id
  and n.ticket_number is null;
