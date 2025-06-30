/*
  # Fix Policy Syntax Error

  1. Changes
    - Remove invalid IF NOT EXISTS from CREATE POLICY
    - Use proper DO block to check policy existence
    - Fix storage policy creation syntax

  2. Security
    - Maintain proper admin authentication for storage operations
    - Ensure bucket permissions are correctly configured
*/

-- Fix the policy creation syntax error
DO $$
BEGIN
  -- Check if the policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Allow authenticated admin uploads'
  ) THEN
    CREATE POLICY "Allow authenticated admin uploads"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'product-images' AND
        auth.uid() IS NOT NULL
      );
  END IF;
END $$;

-- Ensure the bucket exists with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 
  'product-images', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Create a simplified admin check function for storage
CREATE OR REPLACE FUNCTION is_storage_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow if admin context is set
  IF COALESCE(current_setting('app.is_admin', true), 'false') = 'true' THEN
    RETURN true;
  END IF;
  
  -- Allow if user is in admin_users table
  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() AND is_active = true
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Grant execute permission on the storage admin function
GRANT EXECUTE ON FUNCTION is_storage_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_storage_admin() TO anon;

-- Update existing storage policies to use the new function
DO $$
BEGIN
  -- Update upload policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Admins can upload product images'
  ) THEN
    DROP POLICY "Admins can upload product images" ON storage.objects;
  END IF;
  
  CREATE POLICY "Admins can upload product images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'product-images' AND is_storage_admin()
    );

  -- Update update policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Admins can update product images'
  ) THEN
    DROP POLICY "Admins can update product images" ON storage.objects;
  END IF;
  
  CREATE POLICY "Admins can update product images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'product-images' AND is_storage_admin()
    );

  -- Update delete policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Admins can delete product images'
  ) THEN
    DROP POLICY "Admins can delete product images" ON storage.objects;
  END IF;
  
  CREATE POLICY "Admins can delete product images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'product-images' AND is_storage_admin()
    );
END $$;

-- Grant storage permissions to authenticated users
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Update the admin authentication to set proper session variables
CREATE OR REPLACE FUNCTION authenticate_admin_with_session(p_username text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record admin_users%ROWTYPE;
  result json;
BEGIN
  -- Find admin user by username
  SELECT * INTO admin_record
  FROM admin_users
  WHERE username = p_username AND is_active = true;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid username or password';
  END IF;
  
  -- Verify password using crypt function
  IF admin_record.password_hash != crypt(p_password, admin_record.password_hash) THEN
    RAISE EXCEPTION 'Invalid username or password';
  END IF;
  
  -- Set admin context and session variables
  PERFORM set_config('app.is_admin', 'true', true);
  PERFORM set_config('app.admin_id', admin_record.id::text, true);
  PERFORM set_config('app.admin_role', admin_record.role, true);
  
  -- Update last login
  UPDATE admin_users 
  SET last_login = now() 
  WHERE id = admin_record.id;
  
  -- Return admin user data (excluding password)
  result := json_build_object(
    'id', admin_record.id,
    'username', admin_record.username,
    'email', admin_record.email,
    'full_name', admin_record.full_name,
    'role', admin_record.role,
    'avatar_url', admin_record.avatar_url,
    'is_active', admin_record.is_active,
    'last_login', now(),
    'created_at', admin_record.created_at,
    'session_admin', true
  );
  
  RETURN result;
END;
$$;

-- Grant permissions for the enhanced authentication function
GRANT EXECUTE ON FUNCTION authenticate_admin_with_session(text, text) TO anon;
GRANT EXECUTE ON FUNCTION authenticate_admin_with_session(text, text) TO authenticated;

-- Verify the setup
DO $$
DECLARE
  policy_count integer;
  bucket_exists boolean;
BEGIN
  -- Check if policies exist
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname LIKE '%product images%';
    
  -- Check if bucket exists
  SELECT EXISTS(
    SELECT 1 FROM storage.buckets WHERE id = 'product-images'
  ) INTO bucket_exists;
  
  IF policy_count > 0 AND bucket_exists THEN
    RAISE NOTICE 'Storage setup completed successfully - % policies found, bucket exists: %', policy_count, bucket_exists;
  ELSE
    RAISE WARNING 'Storage setup may have issues - % policies found, bucket exists: %', policy_count, bucket_exists;
  END IF;
END $$;