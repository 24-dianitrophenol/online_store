/*
  # Fix Anonymous User Permissions

  This migration ensures that anonymous users can properly access products and categories data.
  
  ## Changes Made
  
  1. **Products Table**
     - Ensure RLS is enabled
     - Add/update policy for anonymous users to read available products
     - Add/update policy for public users to read available products
  
  2. **Categories Table**
     - Ensure RLS is enabled
     - Add/update policy for anonymous users to read active categories
     - Add/update policy for public users to read active categories
  
  3. **Product Images Table**
     - Ensure anonymous users can read images for available products
  
  4. **Inventory Table**
     - Ensure anonymous users can read inventory for available products

  ## Security
  - All policies restrict access to only publicly available data
  - Admin-only operations remain protected
*/

-- Ensure RLS is enabled on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Allow anonymous read on products" ON products;
DROP POLICY IF EXISTS "Products are viewable by anon" ON products;
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;

DROP POLICY IF EXISTS "Allow anonymous read on categories" ON categories;
DROP POLICY IF EXISTS "Categories are viewable by anon" ON categories;
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;

DROP POLICY IF EXISTS "Allow anonymous read on product_images" ON product_images;
DROP POLICY IF EXISTS "Product images are viewable by anon" ON product_images;
DROP POLICY IF EXISTS "Product images are viewable by everyone" ON product_images;

DROP POLICY IF EXISTS "Allow anonymous read on inventory" ON inventory;
DROP POLICY IF EXISTS "Inventory is viewable by anon" ON inventory;
DROP POLICY IF EXISTS "Inventory is viewable by everyone" ON inventory;

-- Create comprehensive policies for products
CREATE POLICY "Anonymous users can read available products"
  ON products
  FOR SELECT
  TO anon
  USING (available = true);

CREATE POLICY "Authenticated users can read available products"
  ON products
  FOR SELECT
  TO authenticated
  USING (available = true);

CREATE POLICY "Public users can read available products"
  ON products
  FOR SELECT
  TO public
  USING (available = true);

-- Create comprehensive policies for categories
CREATE POLICY "Anonymous users can read active categories"
  ON categories
  FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Authenticated users can read active categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Public users can read active categories"
  ON categories
  FOR SELECT
  TO public
  USING (is_active = true);

-- Create comprehensive policies for product images
CREATE POLICY "Anonymous users can read product images"
  ON product_images
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_images.product_id 
      AND products.available = true
    )
  );

CREATE POLICY "Authenticated users can read product images"
  ON product_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_images.product_id 
      AND products.available = true
    )
  );

CREATE POLICY "Public users can read product images"
  ON product_images
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_images.product_id 
      AND products.available = true
    )
  );

-- Create comprehensive policies for inventory
CREATE POLICY "Anonymous users can read inventory"
  ON inventory
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = inventory.product_id 
      AND products.available = true
    )
  );

CREATE POLICY "Authenticated users can read inventory"
  ON inventory
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = inventory.product_id 
      AND products.available = true
    )
  );

CREATE POLICY "Public users can read inventory"
  ON inventory
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = inventory.product_id 
      AND products.available = true
    )
  );

-- Ensure admin policies still exist and work properly
DO $$
BEGIN
  -- Check if admin policies exist, if not create them
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' 
    AND policyname = 'Only admins can manage products'
  ) THEN
    CREATE POLICY "Only admins can manage products"
      ON products
      FOR ALL
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'categories' 
    AND policyname = 'Only admins can manage categories'
  ) THEN
    CREATE POLICY "Only admins can manage categories"
      ON categories
      FOR ALL
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_images' 
    AND policyname = 'Only admins can manage product images'
  ) THEN
    CREATE POLICY "Only admins can manage product images"
      ON product_images
      FOR ALL
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory' 
    AND policyname = 'Only admins can manage inventory'
  ) THEN
    CREATE POLICY "Only admins can manage inventory"
      ON inventory
      FOR ALL
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- Grant necessary permissions to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON products TO anon, authenticated;
GRANT SELECT ON categories TO anon, authenticated;
GRANT SELECT ON product_images TO anon, authenticated;
GRANT SELECT ON inventory TO anon, authenticated;

-- Ensure the is_admin function exists and works properly
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if there's an admin context set
  RETURN COALESCE(current_setting('app.admin_context', true)::boolean, false);
END;
$$;