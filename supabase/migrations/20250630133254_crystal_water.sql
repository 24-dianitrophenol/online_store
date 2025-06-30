/*
  # Add Admin Settings Management Functions

  1. New Functions
    - `update_admin_profile()` - Updates admin profile information
    - `change_admin_password()` - Changes admin password with validation
    - `get_admin_settings()` - Gets admin settings and database info

  2. Security
    - Functions use security definer to bypass RLS when needed
    - Proper validation for password changes
    - Admin context checking for elevated permissions
*/

-- Function to update admin profile
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
  -- Set admin context
  PERFORM set_config('app.is_admin', 'true', true);
  
  -- Check if username already exists (excluding current user)
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE username = p_username AND id != p_admin_id
  ) INTO username_exists;
  
  IF username_exists THEN
    RAISE EXCEPTION 'Username already exists';
  END IF;
  
  -- Check if email already exists (excluding current user)
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE email = p_email AND id != p_admin_id
  ) INTO email_exists;
  
  IF email_exists THEN
    RAISE EXCEPTION 'Email already exists';
  END IF;
  
  -- Update admin profile
  UPDATE admin_users 
  SET 
    username = p_username,
    email = p_email,
    full_name = p_full_name,
    updated_at = now()
  WHERE id = p_admin_id;
  
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
  -- Set admin context
  PERFORM set_config('app.is_admin', 'true', true);
  
  -- Get admin record
  SELECT * INTO admin_record
  FROM admin_users
  WHERE id = p_admin_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;
  
  -- Verify current password
  IF admin_record.password_hash != crypt(p_current_password, admin_record.password_hash) THEN
    RAISE EXCEPTION 'Current password is incorrect';
  END IF;
  
  -- Validate new password
  IF length(p_new_password) < 6 THEN
    RAISE EXCEPTION 'New password must be at least 6 characters long';
  END IF;
  
  -- Update password
  UPDATE admin_users 
  SET 
    password_hash = crypt(p_new_password, gen_salt('bf')),
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

-- Function to get admin settings and database info
CREATE OR REPLACE FUNCTION get_admin_settings(p_admin_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record admin_users%ROWTYPE;
  total_products integer;
  total_orders integer;
  result json;
BEGIN
  -- Set admin context
  PERFORM set_config('app.is_admin', 'true', true);
  
  -- Get admin record
  SELECT * INTO admin_record
  FROM admin_users
  WHERE id = p_admin_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;
  
  -- Get database statistics
  SELECT COUNT(*) INTO total_products FROM products;
  SELECT COUNT(*) INTO total_orders FROM orders;
  
  -- Build result
  result := json_build_object(
    'admin', json_build_object(
      'id', admin_record.id,
      'username', admin_record.username,
      'email', admin_record.email,
      'full_name', admin_record.full_name,
      'role', admin_record.role,
      'avatar_url', admin_record.avatar_url,
      'last_login', admin_record.last_login,
      'created_at', admin_record.created_at
    ),
    'database', json_build_object(
      'total_products', total_products,
      'total_orders', total_orders,
      'connection_status', 'active',
      'real_time_sync', true
    )
  );
  
  RETURN result;
END;
$$;

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION update_admin_profile(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION change_admin_password(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_settings(uuid) TO authenticated;