-- Upgrades batch — Phase 0
-- (#11) deal_reminders — deadlines / reminders attached to a deal.
--       notifications  — in-app notifications, one row per recipient user.

-- ─────────────────────────────────────────────────────────────────────────────
-- Deal reminders / deadlines
-- ─────────────────────────────────────────────────────────────────────────────
create table public.deal_reminders (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references public.agencies(id) on delete cascade,
  deal_id    uuid not null references public.deals(id) on delete cascade,
  title      text not null,
  due_at     timestamptz not null,
  done       boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index deal_reminders_deal_idx   on public.deal_reminders(deal_id);
create index deal_reminders_agency_idx on public.deal_reminders(agency_id, due_at);

alter table public.deal_reminders enable row level security;
create policy deal_reminders_all on public.deal_reminders
  for all to authenticated
  using (agency_id in (select public.auth_agency_ids()))
  with check (agency_id in (select public.auth_agency_ids()));

-- ─────────────────────────────────────────────────────────────────────────────
-- In-app notifications (per recipient). A member may create a notification for
-- any colleague in their agency; each user reads / marks-read only their own.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  agency_id  uuid not null references public.agencies(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, read_at);

alter table public.notifications enable row level security;

-- Read / update (mark read) / delete only your own notifications.
create policy notifications_select on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- Insert: any member of the row's agency (so you can notify a colleague).
create policy notifications_insert on public.notifications
  for insert to authenticated
  with check (agency_id in (select public.auth_agency_ids()));
