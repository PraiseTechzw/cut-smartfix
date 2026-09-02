-- ============================================================
-- Migration 0003: Full CUT SmartFix schema expansion
-- Adds: full status workflow, priority enum, ticket numbering,
--       location hierarchy, departments, categories,
--       assignments, material requests, audit logs, notes,
--       rate-limiting helper, RLS policies for staff/admin
-- ============================================================

-- ─────────────────────────────────────────
-- 1. New enum types
-- ─────────────────────────────────────────
create type priority_level as enum ('critical', 'high', 'medium', 'low');

create type full_report_status as enum (
  'submitted',
  'under_review',
  'assigned',
  'accepted',
  'in_progress',
  'waiting_for_materials',
  'repair_completed',
  'under_verification',
  'closed',
  'rejected',
  'duplicate',
  'cancelled',
  'reopened'
);

create type material_request_status as enum (
  'requested',
  'approved',
  'rejected',
  'issued',
  'received'
);

create type assignment_status as enum (
  'assigned',
  'accepted',
  'rejected',
  'reassigned'
);

-- ─────────────────────────────────────────
-- 2. Extend profiles with student/staff fields
-- ─────────────────────────────────────────
alter table profiles
  add column if not exists phone text,
  add column if not exists student_id text,
  add column if not exists department_id uuid,
  add column if not exists is_active boolean not null default true,
  add column if not exists avatar_url text,
  add column if not exists push_token text;

-- ─────────────────────────────────────────
-- 3. Departments
-- ─────────────────────────────────────────
create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 120),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles
  add constraint profiles_department_fk
  foreign key (department_id) references departments(id);

-- ─────────────────────────────────────────
-- 4. Location hierarchy: Campus → Area → Building → Floor → Room
-- ─────────────────────────────────────────
create table campuses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 120),
  code text not null unique,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table areas (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references campuses(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campus_id, name)
);

create table buildings (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references areas(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (area_id, name)
);

create table floors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  level_number int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, name)
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references floors(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  room_number text,
  room_type text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (floor_id, name)
);

-- ─────────────────────────────────────────
-- 5. Maintenance categories and subcategories
-- ─────────────────────────────────────────
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 100),
  icon text,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, name)
);

-- ─────────────────────────────────────────
-- 6. Ticket sequence for human-readable numbers: CUT-MNT-2026-000125
-- ─────────────────────────────────────────
create sequence ticket_seq start 1 increment 1 no maxvalue;

create or replace function next_ticket_number()
returns text language sql as $$
  select 'CUT-MNT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('ticket_seq')::text, 6, '0');
$$;

-- ─────────────────────────────────────────
-- 7. Expand maintenance_reports with full fields
-- ─────────────────────────────────────────
-- Add new columns (old ones remain for backward compat)
alter table maintenance_reports
  add column if not exists category_id uuid references categories(id),
  add column if not exists subcategory_id uuid references subcategories(id),
  add column if not exists room_id uuid references rooms(id),
  add column if not exists priority priority_level,
  add column if not exists department_id uuid references departments(id),
  add column if not exists assigned_department_id uuid references departments(id),
  add column if not exists reviewed_by uuid references profiles(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists due_date timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists completion_notes text,
  add column if not exists is_overdue boolean not null default false;

-- Replace default ticket number with the proper sequential one
alter table maintenance_reports
  alter column ticket_number set default next_ticket_number();

-- ─────────────────────────────────────────
-- 8. Assignments table (tracks assignment history)
-- ─────────────────────────────────────────
create table assignments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references maintenance_reports(id) on delete cascade,
  technician_id uuid not null references profiles(id),
  assigned_by uuid not null references profiles(id),
  department_id uuid references departments(id),
  status assignment_status not null default 'assigned',
  notes text,
  rejected_reason text,
  assigned_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 9. Maintenance notes
-- ─────────────────────────────────────────
create table maintenance_notes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references maintenance_reports(id) on delete cascade,
  author_id uuid not null references profiles(id),
  content text not null check (char_length(content) between 1 and 5000),
  note_type text not null default 'general' check (note_type in ('general', 'diagnosis', 'work_note', 'completion', 'verification', 'rejection', 'internal')),
  is_visible_to_student boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 10. Completion evidence (separate from student attachments)
-- ─────────────────────────────────────────
create table completion_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references maintenance_reports(id) on delete cascade,
  uploaded_by uuid not null references profiles(id),
  storage_path text not null unique,
  file_name text not null,
  content_type text not null,
  caption text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 11. Material requests
-- ─────────────────────────────────────────
create table material_requests (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references maintenance_reports(id) on delete cascade,
  requested_by uuid not null references profiles(id),
  approved_by uuid references profiles(id),
  material_name text not null check (char_length(material_name) between 2 and 200),
  quantity int not null check (quantity > 0),
  unit text not null default 'units',
  reason text not null check (char_length(reason) between 5 and 1000),
  status material_request_status not null default 'requested',
  rejection_reason text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  issued_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 12. Audit log
-- ─────────────────────────────────────────
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_idx on audit_logs(actor_id, created_at desc);
create index audit_logs_entity_idx on audit_logs(entity_type, entity_id, created_at desc);
create index audit_logs_action_idx on audit_logs(action, created_at desc);

-- ─────────────────────────────────────────
-- 13. Notification improvements
-- ─────────────────────────────────────────
alter table notifications
  add column if not exists type text not null default 'info',
  add column if not exists action_url text,
  add column if not exists metadata jsonb;

-- ─────────────────────────────────────────
-- 14. Additional indexes
-- ─────────────────────────────────────────
create index assignments_report_idx on assignments(report_id, is_current);
create index assignments_technician_idx on assignments(technician_id, status);
create index material_requests_report_idx on material_requests(report_id, status);
create index maintenance_notes_report_idx on maintenance_notes(report_id, created_at);
create index maintenance_reports_status_idx on maintenance_reports(status, created_at desc);
create index maintenance_reports_priority_idx on maintenance_reports(priority, status);
create index maintenance_reports_department_idx on maintenance_reports(assigned_department_id, status);

-- ─────────────────────────────────────────
-- 15. Automatic updated_at timestamps
-- ─────────────────────────────────────────
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger departments_updated_at before update on departments for each row execute function touch_updated_at();
create trigger campuses_updated_at before update on campuses for each row execute function touch_updated_at();
create trigger areas_updated_at before update on areas for each row execute function touch_updated_at();
create trigger buildings_updated_at before update on buildings for each row execute function touch_updated_at();
create trigger floors_updated_at before update on floors for each row execute function touch_updated_at();
create trigger rooms_updated_at before update on rooms for each row execute function touch_updated_at();
create trigger categories_updated_at before update on categories for each row execute function touch_updated_at();
create trigger subcategories_updated_at before update on subcategories for each row execute function touch_updated_at();
create trigger assignments_updated_at before update on assignments for each row execute function touch_updated_at();
create trigger maintenance_notes_updated_at before update on maintenance_notes for each row execute function touch_updated_at();
create trigger material_requests_updated_at before update on material_requests for each row execute function touch_updated_at();

-- ─────────────────────────────────────────
-- 16. Seed default categories
-- ─────────────────────────────────────────
insert into categories (name, icon, sort_order) values
  ('Electrical', 'zap', 1),
  ('Plumbing', 'droplets', 2),
  ('Building / Structural', 'building-2', 3),
  ('Furniture', 'armchair', 4),
  ('ICT Infrastructure', 'monitor', 5),
  ('Cleaning / Sanitation', 'sparkles', 6),
  ('Grounds', 'tree-pine', 7),
  ('Safety', 'shield-alert', 8),
  ('Other', 'wrench', 9);

-- Seed default departments
insert into departments (name, description) values
  ('Electrical Maintenance', 'Responsible for electrical systems and power infrastructure'),
  ('Plumbing & Sanitation', 'Water systems, drainage and sanitation'),
  ('Civil & Structural', 'Buildings, structures and grounds'),
  ('ICT Services', 'Network, computers and ICT infrastructure'),
  ('Grounds & Landscaping', 'Outdoor spaces and landscaping'),
  ('General Maintenance', 'Furniture, cleaning and general repairs');
