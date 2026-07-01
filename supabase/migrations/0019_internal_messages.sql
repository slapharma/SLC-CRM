-- Phase 4 — internal user-to-user messages
-- Powers "My Messages" (inbox) and the "Send to team" action on record pages. A
-- message optionally carries a `link` to the record it was sent about. Agency-
-- scoped like the rest of the schema; you only ever see messages you sent or
-- received.

create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references public.agencies(id) on delete cascade,
  sender_id    uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  subject      text,
  body         text not null,
  link         text,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index messages_recipient_idx on public.messages(recipient_id, read_at);
create index messages_agency_idx    on public.messages(agency_id, created_at desc);

alter table public.messages enable row level security;

-- Send: any agency member, only as themselves.
create policy messages_insert on public.messages
  for insert to authenticated
  with check (agency_id in (select public.auth_agency_ids()) and sender_id = auth.uid());

-- Read: your own sent or received messages, within your agency.
create policy messages_select on public.messages
  for select to authenticated
  using (
    agency_id in (select public.auth_agency_ids())
    and (sender_id = auth.uid() or recipient_id = auth.uid())
  );

-- Mark read: only the recipient.
create policy messages_update on public.messages
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Delete: either party.
create policy messages_delete on public.messages
  for delete to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
