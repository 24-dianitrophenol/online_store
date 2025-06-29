/*
  # Fix SQL Syntax Errors

  1. Fixes
    - Remove problematic concatenation in COMMENT statement
    - Fix any other syntax issues
    - Ensure proper SQL formatting

  2. Updates
    - Clean up admin authentication
    - Fix storage policies
    - Ensure image column exists properly
*/

-- Update the admin user password to use proper hashing
-- First, enable the pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the admin user with properly hashed password
UPDATE admin_users 
SET password_hash = crypt('admin123', gen_salt('bf'))
WHERE username = 'admin';

-- Fix the authenticate_admin function to handle password verification correctly
CREATE OR REPLACE FUNCTION authenticate_admin(p_username text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record admin_users%ROWTYPE;
  result json;
BEGIN
  -- Set admin context for this operation
  PERFORM set_config('app.is_admin', 'true', true);
  
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
    'created_at', admin_record.created_at
  );
  
  RETURN result;
END;
$$;

-- Create a function to set admin session for authenticated users
CREATE OR REPLACE FUNCTION set_admin_session(admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set admin context and user ID in session
  PERFORM set_config('app.is_admin', 'true', true);
  PERFORM set_config('app.admin_id', admin_id::text, true);
END;
$$;

-- Update the is_admin function to be more robust
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_id_setting text;
  admin_exists boolean := false;
BEGIN
  -- Check if admin context is set
  IF COALESCE(current_setting('app.is_admin', true), 'false') != 'true' THEN
    RETURN false;
  END IF;
  
  -- Get admin ID from session
  admin_id_setting := current_setting('app.admin_id', true);
  
  -- If no admin ID in session, check if we have a valid authenticated user
  IF admin_id_setting IS NULL OR admin_id_setting = '' THEN
    -- For authenticated users, check if they exist in admin_users table
    IF auth.uid() IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM admin_users 
        WHERE id = auth.uid() AND is_active = true
      ) INTO admin_exists;
      RETURN admin_exists;
    END IF;
    RETURN false;
  END IF;
  
  -- Verify the admin ID exists and is active
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE id = admin_id_setting::uuid AND is_active = true
  ) INTO admin_exists;
  
  RETURN admin_exists;
END;
$$;

-- Ensure the image column exists and has proper constraints
DO $$
BEGIN
  -- Add image column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'image'
  ) THEN
    ALTER TABLE products ADD COLUMN image text DEFAULT '/images/placeholder.jpg';
  END IF;
  
  -- Set default value if not set
  ALTER TABLE products ALTER COLUMN image SET DEFAULT '/images/placeholder.jpg';
END $$;

-- Update any null image values
UPDATE products 
SET image = '/images/placeholder.jpg'
WHERE image IS NULL OR image = '';

-- Fix storage policies to work with admin authentication
DROP POLICY IF EXISTS "Authenticated can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon upload to product images" ON storage.objects;

-- Create more permissive storage policies for admin operations
CREATE POLICY "Admins can upload product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' AND
    (
      is_admin() OR
      EXISTS (
        SELECT 1 FROM admin_users
        WHERE id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Admins can update product images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    (
      is_admin() OR
      EXISTS (
        SELECT 1 FROM admin_users
        WHERE id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Admins can delete product images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    (
      is_admin() OR
      EXISTS (
        SELECT 1 FROM admin_users
        WHERE id = auth.uid() AND is_active = true
      )
    )
  );

-- Add a policy for anon users to upload (for public API access)
CREATE POLICY "Allow anon upload to product images"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'product-images');

-- Create a helper function for frontend authentication
CREATE OR REPLACE FUNCTION admin_login(p_username text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_result json;
  admin_id uuid;
BEGIN
  -- Authenticate the admin
  auth_result := authenticate_admin(p_username, p_password);
  
  -- Extract admin ID from result
  admin_id := (auth_result->>'id')::uuid;
  
  -- Set admin session
  PERFORM set_admin_session(admin_id);
  
  RETURN auth_result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION set_admin_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION set_admin_session(uuid) TO anon;
GRANT EXECUTE ON FUNCTION admin_login(text, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_login(text, text) TO authenticated;

-- Force a schema refresh by updating table comment (fixed syntax)
COMMENT ON TABLE products IS 'Products table with image support';

-- Verify the admin user password was updated correctly
DO $$
DECLARE
  admin_count integer;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM admin_users
  WHERE username = 'admin' 
    AND password_hash != 'admin123'  -- Should not be plain text anymore
    AND is_active = true;
    
  IF admin_count = 0 THEN
    RAISE EXCEPTION 'Admin user password was not properly hashed';
  END IF;
  
  RAISE NOTICE 'Admin authentication setup completed successfully';
END $$;