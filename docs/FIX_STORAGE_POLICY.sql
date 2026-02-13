-- 🛠️ FIX: Supabase Storage Policies
-- Run this in the Supabase SQL Editor to allow uploads.

-- 1. Policy for Uploading (INSERT)
-- Allows any authenticated user to upload files to the 'memory-images' bucket
create policy "Authenticated users can upload images" on storage.objects for
insert
    to authenticated
with
    check (bucket_id = 'memory-images');

-- 2. Policy for Viewing (SELECT)
-- Allows anyone (public) to view/download images from this bucket
create policy "Public can view images" on storage.objects for
select to public using (bucket_id = 'memory-images');

-- 3. (Optional) Policy for Deleting
-- Only allow deleting if needed (currently your app doesn't delete files, only DB rows)
create policy "Authenticated users can delete images" on storage.objects for delete to authenticated using (bucket_id = 'memory-images');