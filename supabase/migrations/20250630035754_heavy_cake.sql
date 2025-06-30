/*
  # Add Admin Profile Update Functions

  1. New Functions
    - `update_admin_profile()` - Updates admin profile information
    - `change_admin_password()` - Changes admin password with validation

  2. Security
    - Functions use security definer to bypass RLS when needed
    - Proper validation for password changes
    - Admin context checking for elevated permissions

  3. Updates
    - Enhanced admin profile management
    - Secure password change functionality
*/

-- Function to update admin profile information
CREATE OR REPLACE FUNCTION update_admin_profile(
  p_admin_id uuid,
  p_username text,
  p_email text,
  p_full_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  username_exists boolean;
  email_exists boolean;
BEGIN
  -- Validate admin_id is provided
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin ID is required';
  END IF;
  
  -- Set admin context
  PERFORM set_config('app.is_admin', 'true', true);
  PERFORM set_config('app.admin_id', p_admin_id::text, true);
  
  -- Validate required fields
  IF p_username IS NULL OR trim(p_username) = '' THEN
    RAISE EXCEPTION 'Username is required';
  END IF;
  
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  
  IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;
  
  -- Check if username already exists (excluding current admin)
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE username = trim(p_username) AND id != p_admin_id
  ) INTO username_exists;
  
  IF username_exists THEN
    RAISE EXCEPTION 'Username already exists';
  END IF;
  
  -- Check if email already exists (excluding current admin)
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE email = trim(p_email) AND id != p_admin_id
  ) INTO email_exists;
  
  IF email_exists THEN
    RAISE EXCEPTION 'Email already exists';
  END IF;
  
  -- Update admin profile
  UPDATE admin_users SET
    username = trim(p_username),
    email = trim(p_email),
    full_name = trim(p_full_name),
    updated_at = now()
  WHERE id = p_admin_id;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Admin not found';
  END IF;
  
  -- Return success result
  result := json_build_object(
    'success', true,
    'message', 'Profile updated successfully',
    'updated_at', now()
  );
  
  RETURN result;
END;
$$;

-- Function to change admin password
CREATE OR REPLACE FUNCTION change_admin_password(
  p_admin_id uuid,
  p_current_password text,
  p_new_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record admin_users%ROWTYPE;
  result json;
BEGIN
  -- Validate admin_id is provided
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin ID is required';
  END IF;
  
  -- Set admin context
  PERFORM set_config('app.is_admin', 'true', true);
  PERFORM set_config('app.admin_id', p_admin_id::text, true);
  
  -- Validate required fields
  IF p_current_password IS NULL OR trim(p_current_password) = '' THEN
    RAISE EXCEPTION 'Current password is required';
  END IF;
  
  IF p_new_password IS NULL OR trim(p_new_password) = '' THEN
    RAISE EXCEPTION 'New password is required';
  END IF;
  
  IF length(trim(p_new_password)) < 6 THEN
    RAISE EXCEPTION 'New password must be at least 6 characters long';
  END IF;
  
  -- Get current admin record
  SELECT * INTO admin_record
  FROM admin_users
  WHERE id = p_admin_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Admin not found';
  END IF;
  
  -- Verify current password (handle both hashed and plain text for development)
  IF admin_record.password_hash != p_current_password AND 
     admin_record.password_hash != crypt(p_current_password, admin_record.password_hash) THEN
    RAISE EXCEPTION 'Current password is incorrect';
  END IF;
  
  -- Update password with proper hashing
  UPDATE admin_users SET
    password_hash = crypt(trim(p_new_password), gen_salt('bf')),
    updated_at = now()
  WHERE id = p_admin_id;
  
  -- Return success result
  result := json_build_object(
    'success', true,
    'message', 'Password changed successfully',
    'updated_at', now()
  );
  
  RETURN result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_admin_profile(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_admin_profile(uuid, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION change_admin_password(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION change_admin_password(uuid, text, text) TO anon;

-- Verify the functions are created correctly
DO $$
DECLARE
  update_profile_exists boolean;
  change_password_exists boolean;
BEGIN
  -- Check if functions exist with correct signatures
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'update_admin_profile'
      AND p.pronargs = 4
  ) INTO update_profile_exists;
  
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'change_admin_password'
      AND p.pronargs = 3
  ) INTO change_password_exists;
  
  IF update_profile_exists AND change_password_exists THEN
    RAISE NOTICE 'Admin settings functions created successfully';
  ELSE
    RAISE WARNING 'Function creation verification failed - Profile: %, Password: %', 
      update_profile_exists, change_password_exists;
  END IF;
END $$;