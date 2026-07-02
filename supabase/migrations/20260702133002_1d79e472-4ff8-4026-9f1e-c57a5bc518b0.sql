-- Remove overly-permissive storage policies on demand-attachments
DROP POLICY IF EXISTS "Allow authenticated users to read request attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Team members can upload attachments" ON storage.objects;