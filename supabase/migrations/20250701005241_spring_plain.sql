/*
  # Fix Admin Authentication System

  1. Updates
    - Fix admin authentication function name mismatch
    - Ensure proper password hashing and verification
    - Update admin user with correct credentials
    - Fix function calls in the frontend

  2. Security
    - Proper password verification using crypt
    - Maintain admin session context
    - Ensure admin user exists with correct credentials
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure admin user exists with correct credentials
INSERT INTO admin_users (username, email, password_hash, full_name, role, is_active)
VALUES ('admin', 'admin@mastore.com', crypt('admin123', gen_salt('bf')), 'Store Administrator', 'admin', true)
ON CONFLICT (username) DO UPDATE SET
  password_hash = crypt('admin123', gen_salt('bf')),
  is_active = true,
  updated_at = now();

-- Fix the main authentication function that the frontend calls
CREATE OR REPLACE FUNCTION authenticate_admin_enhanced(p_username text, p_password text)
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
  
  -- Set comprehensive admin context
  PERFORM set_config('app.is_admin', 'true', true);
  PERFORM set_config('app.admin_id', admin_record.id::text, true);
  PERFORM set_config('app.admin_role', admin_record.role, true);
  PERFORM set_config('app.admin_username', admin_record.username, true);
  
  -- Update last login
  UPDATE admin_users 
  SET last_login = now() 
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
  
  RETURN result;
END;
$$;

-- Create alternative authentication function names for compatibility
CREATE OR REPLACE FUNCTION authenticate_admin(p_username text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN authenticate_admin_enhanced(p_username, p_password);
END;
$$;

-- Create admin login wrapper function
CREATE OR REPLACE FUNCTION admin_login(p_username text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN authenticate_admin_enhanced(p_username, p_password);
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

-- Grant permissions for all authentication functions
GRANT EXECUTE ON FUNCTION authenticate_admin_enhanced(text, text) TO anon;
GRANT EXECUTE ON FUNCTION authenticate_admin_enhanced(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_admin(text, text) TO anon;
GRANT EXECUTE ON FUNCTION authenticate_admin(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_login(text, text) TO anon;
GRANT EXECUTE ON FUNCTION admin_login(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO anon;

-- Verify admin user exists and has correct password
DO $$
DECLARE
  admin_exists boolean;
  password_correct boolean;
BEGIN
  -- Check if admin user exists
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE username = 'admin' AND is_active = true
  ) INTO admin_exists;
  
  -- Check if password is correct
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE username = 'admin' 
      AND password_hash = crypt('admin123', password_hash)
      AND is_active = true
  ) INTO password_correct;
  
  IF admin_exists AND password_correct THEN
    RAISE NOTICE 'Admin authentication setup completed successfully!';
    RAISE NOTICE 'Username: admin, Password: admin123';
  ELSE
    RAISE WARNING 'Admin authentication setup failed - User exists: %, Password correct: %', admin_exists, password_correct;
  END IF;
END $$;