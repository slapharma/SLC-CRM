-- Comms & tasks batch — tasks + firing reminders groundwork
--   tasks                    — standalone to-dos with an optional assignee, due
--                              date and entity link ("record not action" fix).
--   deal_reminders.notified_at — stamped by the due-date cron so each reminder
--                              only fires one notification.
--   notifications → realtime — the bell subscribes to INSERTs; the table must
--                              be in the supabase_realtime publication.

-- ─────────────────────────────────────────────────────────────────────────────
-- Tasks
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references public.agencies(id) on delete cascade,
  title       text not null,
  details     text,
  due_at      timestamptz,
  assignee_id uuid references auth.users(id) on delete set null,
  entity_type text,
  entity_id   uuid,
  status      text not null default 'open' check (status in ('open', 'done')),
  notified_at timestamptz,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tasks_agency_status_due_idx on public.tasks(agency_id, status, due_at);
create index if not exists tasks_assignee_status_idx   on public.tasks(assignee_id, status);

do $$ begin
  create trigger trg_tasks_updated before update on public.tasks
    for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.tasks enable row level security;
do $$ begin
  create policy tasks_all on public.tasks
    for all to authenticated
    using (agency_id in (select public.auth_agency_ids()))
    with check (agency_id in (select public.auth_agency_ids()));
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Deal reminders — one-shot cron notification stamp
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.deal_reminders add column if not exists notified_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime for the notifications bell (idempotent — the publication may already
-- contain the table on environments where it was added by hand).
-- ─────────────────────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
