-- Security advisor: a public bucket with a broad policy lets authenticated users
-- LIST every object across all agencies. Public buckets serve reads via URL, so no
-- SELECT policy is needed — restrict authenticated to write (insert/update/delete) only.
drop policy if exists "disposals media: authenticated write" on storage.objects;

create policy "disposals media: authenticated insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'disposals');
create policy "disposals media: authenticated update" on storage.objects
  for update to authenticated using (bucket_id = 'disposals') with check (bucket_id = 'disposals');
create policy "disposals media: authenticated delete" on storage.objects
  for delete to authenticated using (bucket_id = 'disposals');
