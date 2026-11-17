-- Fix report timeline inserts that were blocked by the table-level RLS policy.
-- The initial timeline row is created automatically by the trigger after a new report
-- is inserted, and the status-change trigger also inserts timeline rows while an
-- assignee or reporter updates the report. Those inserts need an explicit policy.

drop policy if exists timeline_reporter_or_assignee_insert on public.report_timeline;
drop policy if exists timeline_reporter_or_assignee_read on public.report_timeline;

create policy timeline_reporter_or_assignee_insert
on public.report_timeline
for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.maintenance_reports mr
    where mr.id = report_timeline.report_id
      and (
        mr.reporter_id = auth.uid()
        or mr.assigned_to = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('supervisor', 'administrator')
        )
      )
  )
);

create policy timeline_reporter_or_assignee_read
on public.report_timeline
for select
using (
  exists (
    select 1
    from public.maintenance_reports mr
    where mr.id = report_timeline.report_id
      and (
        mr.reporter_id = auth.uid()
        or mr.assigned_to = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role in ('supervisor', 'administrator')
        )
      )
  )
);
