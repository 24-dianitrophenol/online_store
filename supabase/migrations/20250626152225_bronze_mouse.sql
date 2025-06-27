/*
  # Complete Database Setup

  1. Tables
    - admin_users
    - categories  
    - products
    - product_images
    - inventory
    - orders
    - order_items
    - business_analytics
    - settings

  2. Security
    - Enable RLS on all tables
    - Create policies for anonymous and authenticated access
    - Set up admin authentication

  3. Functions
    - Admin authentication
    - Order creation
    - Analytics
*/

-- Drop existing objects to ensure clean setup
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS business_analytics CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS authenticate_admin(text, text) CASCADE;
DROP FUNCTION IF EXISTS create_complete_order(text, jsonb, numeric, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS get_order_analytics(date, date) CASCADE;
DROP FUNCTION IF EXISTS set_admin_context() CASCADE;
DROP FUNCTION IF EXISTS clear_admin_context() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create admin context functions
CREATE OR REPLACE FUNCTION set_admin_context()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.admin_context', 'true', true);
END;
$$;

CREATE OR REPLACE FUNCTION clear_admin_context()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.admin_context', 'false', true);
END;
$$;

-- Create admin_users table
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'manager')),
  avatar_url text,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  image_url text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE products (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  short_description text,
  price numeric NOT NULL CHECK (price >= 0),
  compare_price numeric CHECK (compare_price >= 0),
  cost_price numeric CHECK (cost_price >= 0),
  sku text UNIQUE,
  barcode text,
  category_id text NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  tags text[] DEFAULT '{}',
  unit text NOT NULL DEFAULT 'kg',
  weight numeric,
  dimensions jsonb,
  available boolean DEFAULT true,
  featured boolean DEFAULT false,
  rating numeric CHECK (rating >= 0 AND rating <= 5),
  review_count integer DEFAULT 0,
  meta_title text,
  meta_description text,
  seo_url text,
  bulk_pricing jsonb DEFAULT '[]',
  image text, -- Add image column for compatibility
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_images table
CREATE TABLE product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text text,
  display_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create inventory table
CREATE TABLE inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity numeric DEFAULT 0,
  reserved_quantity numeric DEFAULT 0,
  reorder_level numeric DEFAULT 0,
  max_stock_level numeric,
  location text,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(product_id, location)
);

-- Create orders table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_address text,
  total_amount numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id),
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create business_analytics table
CREATE TABLE business_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  total_revenue numeric DEFAULT 0,
  total_orders integer DEFAULT 0,
  total_customers integer DEFAULT 0,
  top_selling_products jsonb,
  category_performance jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create settings table
CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_available ON products(available);
CREATE INDEX idx_products_featured ON products(featured);
CREATE INDEX idx_products_tags ON products USING gin(tags);
CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_is_primary ON product_images(is_primary);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_settings_key ON settings(key);

-- Enable Row Level Security on all tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create admin authentication function
CREATE OR REPLACE FUNCTION authenticate_admin(p_username text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record admin_users%ROWTYPE;
  result json;
BEGIN
  PERFORM set_admin_context();
  
  SELECT * INTO admin_record
  FROM admin_users
  WHERE username = p_username 
    AND is_active = true;
  
  IF admin_record.id IS NULL OR admin_record.password_hash != p_password THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;
  
  result := json_build_object(
    'id', admin_record.id,
    'username', admin_record.username,
    'email', admin_record.email,
    'full_name', admin_record.full_name,
    'role', admin_record.role,
    'avatar_url', admin_record.avatar_url,
    'last_login', admin_record.last_login
  );
  
  RETURN result;
END;
$$;

-- Create order creation function
CREATE OR REPLACE FUNCTION create_complete_order(
  p_customer_name text,
  p_order_items jsonb,
  p_total_amount numeric,
  p_customer_email text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_customer_address text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  new_order_id uuid;
  order_number_val text;
  item jsonb;
  result json;
BEGIN
  order_number_val := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 10000)::text, 4, '0');
  
  INSERT INTO orders (
    order_number,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    total_amount,
    notes
  ) VALUES (
    order_number_val,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_customer_address,
    p_total_amount,
    p_notes
  ) RETURNING id INTO new_order_id;
  
  FOR item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    INSERT INTO order_items (
      order_id,
      product_id,
      quantity,
      unit_price,
      total_price
    ) VALUES (
      new_order_id,
      (item->>'product_id')::text,
      (item->>'quantity')::numeric,
      (item->>'unit_price')::numeric,
      (item->>'total_price')::numeric
    );
  END LOOP;
  
  result := json_build_object(
    'id', new_order_id,
    'order_number', order_number_val,
    'customer_name', p_customer_name,
    'total_amount', p_total_amount,
    'status', 'pending'
  );
  
  RETURN result;
END;
$$;

-- Create analytics function
CREATE OR REPLACE FUNCTION get_order_analytics(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date date;
  end_date date;
  total_orders integer;
  total_revenue numeric;
  total_customers integer;
  pending_orders integer;
  completed_orders integer;
  result json;
BEGIN
  PERFORM set_admin_context();
  
  start_date := COALESCE(p_start_date, CURRENT_DATE);
  end_date := COALESCE(p_end_date, CURRENT_DATE);
  
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_amount), 0),
    COUNT(DISTINCT COALESCE(customer_email, customer_phone, customer_name))
  INTO total_orders, total_revenue, total_customers
  FROM orders
  WHERE DATE(created_at) BETWEEN start_date AND end_date;
  
  SELECT COUNT(*) INTO pending_orders
  FROM orders
  WHERE status = 'pending' AND DATE(created_at) BETWEEN start_date AND end_date;
  
  SELECT COUNT(*) INTO completed_orders
  FROM orders
  WHERE status IN ('delivered', 'completed') AND DATE(created_at) BETWEEN start_date AND end_date;
  
  result := json_build_object(
    'total_orders', total_orders,
    'total_revenue', total_revenue,
    'total_customers', total_customers,
    'pending_orders', pending_orders,
    'completed_orders', completed_orders,
    'average_order_value', CASE WHEN total_orders > 0 THEN total_revenue / total_orders ELSE 0 END
  );
  
  RETURN result;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for anonymous access

-- Categories policies
CREATE POLICY "Categories are viewable by everyone"
  ON categories
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Categories are viewable by anon"
  ON categories
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Products policies
CREATE POLICY "Products are viewable by everyone"
  ON products
  FOR SELECT
  TO public
  USING (available = true);

CREATE POLICY "Products are viewable by anon"
  ON products
  FOR SELECT
  TO anon
  USING (available = true);

-- Product images policies
CREATE POLICY "Product images are viewable by everyone"
  ON product_images
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE id = product_images.product_id
        AND available = true
    )
  );

CREATE POLICY "Product images are viewable by anon"
  ON product_images
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE id = product_images.product_id
        AND available = true
    )
  );

-- Inventory policies
CREATE POLICY "Inventory is viewable by everyone"
  ON inventory
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE id = inventory.product_id
        AND available = true
    )
  );

CREATE POLICY "Inventory is viewable by anon"
  ON inventory
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE id = inventory.product_id
        AND available = true
    )
  );

-- Admin policies
CREATE POLICY "Admin users can read own data"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Admin users can update own data"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Admin management policies
CREATE POLICY "Only admins can manage categories"
  ON categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id::text = auth.uid()::text
        AND is_active = true
    )
  );

CREATE POLICY "Only admins can manage products"
  ON products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id::text = auth.uid()::text
        AND is_active = true
    )
  );

CREATE POLICY "Only admins can manage product images"
  ON product_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id::text = auth.uid()::text
        AND is_active = true
    )
  );

CREATE POLICY "Only admins can manage inventory"
  ON inventory
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id::text = auth.uid()::text
        AND is_active = true
    )
  );

-- Orders policies - Allow public to create orders, admins to view/manage
CREATE POLICY "Anyone can create orders"
  ON orders
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Only admins can view orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id::text = auth.uid()::text
        AND is_active = true
    )
  );

CREATE POLICY "Only admins can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id::text = auth.uid()::text
        AND is_active = true
    )
  );

-- Order items policies
CREATE POLICY "Anyone can create order items"
  ON order_items
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Only admins can view order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id::text = auth.uid()::text
        AND is_active = true
    )
  );

-- Business analytics policies
CREATE POLICY "Only admins can access analytics"
  ON business_analytics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id::text = auth.uid()::text
        AND is_active = true
    )
  );

-- Settings policies
CREATE POLICY "Only admins can manage settings"
  ON settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id::text = auth.uid()::text
        AND is_active = true
    )
  );

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete product images" ON storage.objects;

-- Storage policies
CREATE POLICY "Public can view product images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated can upload product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE id::text = auth.uid()::text
        AND is_active = true
    )
  );

CREATE POLICY "Authenticated can update product images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE id::text = auth.uid()::text
        AND is_active = true
    )
  );

CREATE POLICY "Authenticated can delete product images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE id::text = auth.uid()::text
        AND is_active = true
    )
  );

-- Insert sample data

-- Sample admin user (password: admin123)
INSERT INTO admin_users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@mastore.com', 'admin123', 'Store Administrator', 'admin');

-- Sample categories
INSERT INTO categories (id, name, description, icon, display_order) VALUES
('rice', 'Rice', 'Premium quality rice varieties', '🍚', 1),
('flour', 'Flour', 'Various types of flour for baking and cooking', '🌾', 2),
('grains', 'Grains', 'Nutritious grains and cereals', '🌾', 3),
('soya', 'Soya Products', 'Soya beans and soya-based products', '🫘', 4),
('spices', 'Spices', 'Fresh and aromatic spices', '🌶️', 5);

-- Sample products
INSERT INTO products (id, name, description, price, category_id, tags, unit, available, featured, image) VALUES
('1', 'Premium Basmati Rice', 'Long grain aromatic basmati rice, perfect for special occasions', 12000, 'rice', ARRAY['premium', 'aromatic', 'long-grain'], 'kg', true, true, '/images/1.jpg'),
('2', 'Local Rice', 'High quality local rice, perfect for daily meals', 8000, 'rice', ARRAY['local', 'daily-use'], 'kg', true, false, '/images/2.jpg'),
('3', 'Wheat Flour', 'Fine wheat flour for baking and cooking', 6000, 'flour', ARRAY['wheat', 'baking'], 'kg', true, false, '/images/3.jpg'),
('4', 'Maize Flour', 'Fresh maize flour for traditional dishes', 5000, 'flour', ARRAY['maize', 'traditional'], 'kg', true, false, '/images/4.jpg'),
('5', 'Soya Beans', 'Protein-rich soya beans', 7000, 'soya', ARRAY['protein', 'healthy'], 'kg', true, true, '/images/5.jpg');

-- Sample product images
INSERT INTO product_images (product_id, image_url, alt_text, is_primary) VALUES
('1', '/images/1.jpg', 'Premium Basmati Rice', true),
('2', '/images/2.jpg', 'Local Rice', true),
('3', '/images/3.jpg', 'Wheat Flour', true),
('4', '/images/4.jpg', 'Maize Flour', true),
('5', '/images/5.jpg', 'Soya Beans', true);

-- Sample inventory
INSERT INTO inventory (product_id, quantity, reorder_level, location) VALUES
('1', 100, 10, 'main'),
('2', 150, 15, 'main'),
('3', 80, 8, 'main'),
('4', 120, 12, 'main'),
('5', 90, 9, 'main');

-- Sample settings
INSERT INTO settings (key, value, description, category) VALUES
('store_name', '"M.A Online Store"', 'Store name displayed on the website', 'general'),
('store_email', '"info@mastore.com"', 'Store contact email', 'general'),
('store_phone', '"+256763721005"', 'Store contact phone number', 'general'),
('whatsapp_number', '"256741068782"', 'WhatsApp number for orders', 'general'),
('delivery_fee', '5000', 'Standard delivery fee', 'shipping'),
('free_delivery_threshold', '500000', 'Minimum order for free delivery', 'shipping');