/*
  # Add Admin Authentication Functions

  1. New Functions
    - `set_admin_context()` - Sets admin session context
    - `clear_admin_context()` - Clears admin session context
    - `authenticate_admin()` - Authenticates admin users
    - `get_order_analytics()` - Gets order analytics for dashboard

  2. Security
    - Functions use security definer to bypass RLS when needed
    - Admin context checking for elevated permissions

  3. Updates
    - Enhanced RLS policies to check admin context
    - Proper admin authentication flow
*/

-- Function to set admin context
CREATE OR REPLACE FUNCTION set_admin_context()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set admin context in session
  PERFORM set_config('app.is_admin', 'true', true);
END;
$$;

-- Function to clear admin context
CREATE OR REPLACE FUNCTION clear_admin_context()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear admin context
  PERFORM set_config('app.is_admin', 'false', true);
END;
$$;

-- Function to authenticate admin users
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
  
  -- Verify password (in production, use proper password hashing)
  IF admin_record.password_hash != crypt(p_password, admin_record.password_hash) THEN
    RAISE EXCEPTION 'Invalid username or password';
  END IF;
  
  -- Return admin user data (excluding password)
  result := json_build_object(
    'id', admin_record.id,
    'username', admin_record.username,
    'email', admin_record.email,
    'full_name', admin_record.full_name,
    'role', admin_record.role,
    'avatar_url', admin_record.avatar_url,
    'is_active', admin_record.is_active,
    'last_login', admin_record.last_login,
    'created_at', admin_record.created_at
  );
  
  RETURN result;
END;
$$;

-- Function to get order analytics for dashboard
CREATE OR REPLACE FUNCTION get_order_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_revenue numeric := 0;
  today_orders integer := 0;
  today_customers integer := 0;
  result json;
BEGIN
  -- Set admin context
  PERFORM set_config('app.is_admin', 'true', true);
  
  -- Get today's stats
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*),
    COUNT(DISTINCT customer_email)
  INTO today_revenue, today_orders, today_customers
  FROM orders
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Build result
  result := json_build_object(
    'total_revenue', today_revenue,
    'total_orders', today_orders,
    'total_customers', today_customers
  );
  
  RETURN result;
END;
$$;

-- Helper function to check if current session is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(current_setting('app.is_admin', true), 'false') = 'true';
END;
$$;

-- Update RLS policies to use admin context

-- Products policies
DROP POLICY IF EXISTS "Only admins can manage products" ON products;
CREATE POLICY "Only admins can manage products"
  ON products
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Categories policies  
DROP POLICY IF EXISTS "Only admins can manage categories" ON categories;
CREATE POLICY "Only admins can manage categories"
  ON categories
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Product images policies
DROP POLICY IF EXISTS "Only admins can manage product images" ON product_images;
CREATE POLICY "Only admins can manage product images"
  ON product_images
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Inventory policies
DROP POLICY IF EXISTS "Only admins can manage inventory" ON inventory;
CREATE POLICY "Only admins can manage inventory"
  ON inventory
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Orders policies
DROP POLICY IF EXISTS "Only admins can view orders" ON orders;
DROP POLICY IF EXISTS "Only admins can update orders" ON orders;

CREATE POLICY "Only admins can view orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Only admins can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Order items policies
DROP POLICY IF EXISTS "Only admins can view order items" ON order_items;
CREATE POLICY "Only admins can view order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Business analytics policies
DROP POLICY IF EXISTS "Only admins can access analytics" ON business_analytics;
CREATE POLICY "Only admins can access analytics"
  ON business_analytics
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Settings policies
DROP POLICY IF EXISTS "Only admins can manage settings" ON settings;
CREATE POLICY "Only admins can manage settings"
  ON settings
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION set_admin_context() TO authenticated;
GRANT EXECUTE ON FUNCTION clear_admin_context() TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_admin(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Grant execute to anon for authentication
GRANT EXECUTE ON FUNCTION authenticate_admin(text, text) TO anon;