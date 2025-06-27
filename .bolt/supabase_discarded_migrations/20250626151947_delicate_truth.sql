/*
  # Fix database permissions and relationships

  1. Security Updates
    - Enable RLS on categories table
    - Add policy for anonymous users to read categories
    - Add policy for anonymous users to read products
    - Add policy for anonymous users to read product_images
    - Add policy for anonymous users to read inventory

  2. Relationship Fixes
    - Add foreign key constraint between products and categories
    - Ensure proper indexing for performance

  3. Data Integrity
    - Ensure all tables have proper constraints
    - Add missing indexes for better query performance
*/

-- Enable RLS on categories table if not already enabled
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Enable RLS on products table if not already enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Enable RLS on product_images table if not already enabled
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Enable RLS on inventory table if not already enabled
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous read access to categories" ON categories;
DROP POLICY IF EXISTS "Allow anonymous read access to products" ON products;
DROP POLICY IF EXISTS "Allow anonymous read access to product_images" ON product_images;
DROP POLICY IF EXISTS "Allow anonymous read access to inventory" ON inventory;

-- Create policies for anonymous users to read categories
CREATE POLICY "Allow anonymous read access to categories"
  ON categories
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Create policies for anonymous users to read products
CREATE POLICY "Allow anonymous read access to products"
  ON products
  FOR SELECT
  TO anon
  USING (available = true);

-- Create policies for anonymous users to read product images
CREATE POLICY "Allow anonymous read access to product_images"
  ON product_images
  FOR SELECT
  TO anon
  USING (true);

-- Create policies for anonymous users to read inventory
CREATE POLICY "Allow anonymous read access to inventory"
  ON inventory
  FOR SELECT
  TO anon
  USING (true);

-- Add foreign key constraint between products and categories if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_products_category_id' 
    AND table_name = 'products'
  ) THEN
    ALTER TABLE products 
    ADD CONSTRAINT fk_products_category_id 
    FOREIGN KEY (category_id) REFERENCES categories (id);
  END IF;
END $$;

-- Add foreign key constraint between product_images and products if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_product_images_product_id' 
    AND table_name = 'product_images'
  ) THEN
    ALTER TABLE product_images 
    ADD CONSTRAINT fk_product_images_product_id 
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint between inventory and products if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_inventory_product_id' 
    AND table_name = 'inventory'
  ) THEN
    ALTER TABLE inventory 
    ADD CONSTRAINT fk_inventory_product_id 
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better query performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_available ON products (available);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories (is_active);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images (product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images (is_primary);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory (product_id);