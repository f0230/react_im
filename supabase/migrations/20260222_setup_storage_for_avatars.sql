-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'avatars', 'avatars', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
);

-- Policy to allow authenticated users to upload to project-avatars folder
-- This uses a simplified policy. For better security, we could restrict it further.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Allow authenticated users to upload project-avatars'
    ) THEN
        CREATE POLICY "Allow authenticated users to upload project-avatars" ON storage.objects
        FOR INSERT TO authenticated WITH CHECK (
            bucket_id = 'avatars' 
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Allow public to view project-avatars'
    ) THEN
        CREATE POLICY "Allow public to view project-avatars" ON storage.objects
        FOR SELECT TO public USING (bucket_id = 'avatars');
    END IF;

    -- Allow users to update their own uploads or admins to update everything
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Allow admins to manage all avatars'
    ) THEN
        CREATE POLICY "Allow admins to manage all avatars" ON storage.objects
        FOR ALL TO authenticated USING (
            bucket_id = 'avatars' AND
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
            )
        );
    END IF;
END $$;
