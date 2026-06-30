-- Fix a cross-tenant leak in the `disposal-docs` storage bucket.
--
-- 0012 created SELECT/INSERT/DELETE policies on storage.objects that gated ONLY
-- on `bucket_id = 'disposal-docs'`. Any authenticated user from ANY agency could
-- therefore read (via signed URL) or delete ANY other agency's uploaded vendor
-- docs / floor plans simply by knowing or guessing the object path. The metadata
-- table (public.disposal_documents) was correctly agency-scoped, but the files
-- themselves were not.
--
-- Object paths are written as `{disposalId}/{timestamp}-{filename}`
-- (see src/components/disposal-documents.tsx). So we scope every storage
-- operation to objects whose leading path segment is a disposal that belongs to
-- one of the caller's agencies. We compare `disposals.id::text` to the path
-- segment (rather than casting the segment to uuid) so a malformed path can
-- never raise a cast error inside the policy — it simply matches nothing.
--
-- Path-based (rather than joining disposal_documents) is deliberate: it holds at
-- upload time, when no metadata row exists yet, and at delete time, where the
-- action removes the metadata row before the storage object.

drop policy if exists "disposal-docs auth select" on storage.objects;
drop policy if exists "disposal-docs auth insert" on storage.objects;
drop policy if exists "disposal-docs auth delete" on storage.objects;

create policy "disposal-docs agency select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'disposal-docs'
    and exists (
      select 1
      from public.disposals d
      where d.id::text = split_part(storage.objects.name, '/', 1)
        and d.agency_id in (select public.auth_agency_ids())
    )
  );

create policy "disposal-docs agency insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'disposal-docs'
    and exists (
      select 1
      from public.disposals d
      where d.id::text = split_part(storage.objects.name, '/', 1)
        and d.agency_id in (select public.auth_agency_ids())
    )
  );

create policy "disposal-docs agency delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'disposal-docs'
    and exists (
      select 1
      from public.disposals d
      where d.id::text = split_part(storage.objects.name, '/', 1)
        and d.agency_id in (select public.auth_agency_ids())
    )
  );
