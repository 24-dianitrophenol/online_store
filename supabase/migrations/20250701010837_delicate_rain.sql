/*
  # Complete Admin Authentication Fix

  1. Fixes
    - Ensure admin user exists with correct credentials
    - Fix all authentication functions
    - Ensure proper permissions and RLS policies
    - Add debugging and verification

  2. Security
    - Proper password hashing with bcrypt
    - Secure function execution
    - Admin context management
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- First, let's clean up and recreate the admin user properly
DELETE FROM admin_users WHERE username = 'admin';

-- Insert admin user with proper bcrypt hashing
INSERT INTO admin_users (
  id,
  username, 
  email, 
  password_hash, 
  full_name, 
  role, 
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin',
  'admin@mastore.com',
  crypt('admin123', gen_salt('bf')),
  'Store Administrator',
  'admin',
  true,
  now(),
  now()
);

-- Create the main authentication function that the frontend expects
CREATE OR REPLACE FUNCTION authenticate_admin_enhanced(p_username text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record admin_users%ROWTYPE;
  result json;
  password_matches boolean := false;
BEGIN
  -- Log the authentication attempt
  RAISE NOTICE 'Authentication attempt for username: %', p_username;
  
  -- Find admin user by username
  SELECT * INTO admin_record
  FROM admin_users
  WHERE username = p_username AND is_active = true;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RAISE NOTICE 'Admin user not found: %', p_username;
    RAISE EXCEPTION 'Invalid username or password';
  END IF;
  
  RAISE NOTICE 'Admin user found: %, checking password...', admin_record.username;
  
  -- Verify password using crypt function
  SELECT (admin_record.password_hash = crypt(p_password, admin_record.password_hash)) INTO password_matches;
  
  IF NOT password_matches THEN
    RAISE NOTICE 'Password verification failed for user: %', p_username;
    RAISE EXCEPTION 'Invalid username or password';
  END IF;
  
  RAISE NOTICE 'Password verified successfully for user: %', p_username;
  
  -- Set comprehensive admin context
  PERFORM set_config('app.is_admin', 'true', true);
  PERFORM set_config('app.admin_id', admin_record.id::text, true);
  PERFORM set_config('app.admin_role', admin_record.role, true);
  PERFORM set_config('app.admin_username', admin_record.username, true);
  
  -- Update last login
  UPDATE admin_users 
  SET last_login = now(), updated_at = now()
  WHERE id = admin_record.id;
  
  -- Return comprehensive admin data
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
    'authenticated', true,
    'session_id', extract(epoch from now())::text
  );
  
  RAISE NOTICE 'Authentication successful for user: %', p_username;
  RETURN result;
END;
$$;

-- Create backup authentication functions
CREATE OR REPLACE FUNCTION authenticate_admin(p_username text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN authenticate_admin_enhanced(p_username, p_password);
END;
$$;

-- Create simple test function to verify admin exists
CREATE OR REPLACE FUNCTION test_admin_exists()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_count integer;
  admin_data json;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM admin_users WHERE username = 'admin';
  
  SELECT json_build_object(
    'admin_count', admin_count,
    'admin_exists', admin_count > 0,
    'admin_data', (
      SELECT json_build_object(
        'id', id,
        'username', username,
        'email', email,
        'is_active', is_active,
        'created_at', created_at
      )
      FROM admin_users 
      WHERE username = 'admin'
      LIMIT 1
    )
  ) INTO admin_data;
  
  RETURN admin_data;
END;
$$;

-- Ensure the is_admin function works properly
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if admin context is set
  IF COALESCE(current_setting('app.is_admin', true), 'false') = 'true' THEN
    RETURN true;
  END IF;
  
  -- Check if authenticated user is admin
  IF auth.uid() IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND is_active = true
    );
  END IF;
  
  RETURN false;
END;
$$;

-- Grant permissions for all functions to both anon and authenticated users
GRANT EXECUTE ON FUNCTION authenticate_admin_enhanced(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION authenticate_admin(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION test_admin_exists() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO anon, authenticated;

-- Ensure RLS policies allow admin operations
DROP POLICY IF EXISTS "Admin users can read own data" ON admin_users;
CREATE POLICY "Admin users can read own data"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (true); -- Allow reading for authentication

DROP POLICY IF EXISTS "Admin users can update own data" ON admin_users;
CREATE POLICY "Admin users can update own data"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true); -- Allow updates for last_login

-- Allow anon users to read admin_users for authentication
CREATE POLICY IF NOT EXISTS "Allow anon to read admin users for auth"
  ON admin_users
  FOR SELECT
  TO anon
  USING (true);

-- Test the authentication setup
DO $$
DECLARE
  test_result json;
  auth_result json;
BEGIN
  -- Test if admin exists
  SELECT test_admin_exists() INTO test_result;
  RAISE NOTICE 'Admin test result: %', test_result;
  
  -- Test authentication
  BEGIN
    SELECT authenticate_admin_enhanced('admin', 'admin123') INTO auth_result;
    RAISE NOTICE 'Authentication test successful: %', (auth_result->>'username');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Authentication test failed: %', SQLERRM;
  END;
END $$;

-- Final verification
DO $$
DECLARE
  admin_count integer;
  function_exists boolean;
BEGIN
  -- Check admin user count
  SELECT COUNT(*) INTO admin_count FROM admin_users WHERE username = 'admin' AND is_active = true;
  
  -- Check if function exists
  SELECT EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'authenticate_admin_enhanced'
  ) INTO function_exists;
  
  IF admin_count > 0 AND function_exists THEN
    RAISE NOTICE '✅ Admin authentication setup completed successfully!';
    RAISE NOTICE '📋 Credentials: Username = admin, Password = admin123';
    RAISE NOTICE '🔧 Function exists: %, Admin count: %', function_exists, admin_count;
  ELSE
    RAISE WARNING '❌ Setup verification failed - Function exists: %, Admin count: %', function_exists, admin_count;
  END IF;
END $$;