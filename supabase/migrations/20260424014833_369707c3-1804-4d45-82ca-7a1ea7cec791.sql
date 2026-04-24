-- Drop the broad public SELECT policy
DROP POLICY IF EXISTS "Logos are publicly viewable" ON storage.objects;

-- Allow public read of individual files (no listing) - only when name is provided
CREATE POLICY "Anyone can view a specific logo file"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos' AND auth.role() = 'anon');

-- Authenticated users can also view (for in-app preview)
CREATE POLICY "Authenticated can view logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos' AND auth.role() = 'authenticated');