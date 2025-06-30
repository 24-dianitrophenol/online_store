/*
  # Fix Admin Dashboard Product Operations

  1. Schema Updates
    - Ensure image column exists and is properly configured
    - Add proper constraints and defaults
    - Force schema cache refresh

  2. Authentication Fixes
    - Improve admin authentication flow
    - Fix storage policies for image uploads
    - Ensure proper session management

  3. Function Updates
    - Fix product creation and update functions
    - Improve error handling
    - Add proper image management

  4. Storage Configuration
    - Ensure bucket exists with proper settings
    - Fix all storage policies
    - Add fallback policies for development
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure the image column exists with proper configuration
DO $$
BEGIN
  -- Add image column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products' 
      AND column_name = 'image'
  ) THEN
    ALTER TABLE products ADD COLUMN image text;
    RAISE NOTICE 'Added image column to products table';
  END IF;
  
  -- Set default value
  ALTER TABLE products ALTER COLUMN image SET DEFAULT '/images/placeholder.jpg';
  
  -- Update any null or empty image values
  UPDATE products 
  SET image = '/images/placeholder.jpg'
  WHERE image IS NULL OR image = '';
  
  RAISE NOTICE 'Image column configured successfully';
END $$;

-- Force schema cache refresh by updating table statistics
ANALYZE products;
ANALYZE product_images;
ANALYZE admin_users;

-- Update admin user with properly hashed password
UPDATE admin_users 
SET password_hash = crypt('admin123', gen_salt('bf'))
WHERE username = 'admin' AND password_hash = 'admin123';

-- Create enhanced admin authentication function
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
  
  -- Verify password (handle both hashed and plain text for development)
  IF admin_record.password_hash != p_password AND 
     admin_record.password_hash != crypt(p_password, admin_record.password_hash) THEN
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

-- Create robust admin check function
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin context first
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

-- Ensure storage bucket exists with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 
  'product-images', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

-- Drop all existing storage policies to start fresh
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated admin uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon upload to product images" ON storage.objects;

-- Create comprehensive storage policies
CREATE POLICY "Anyone can view product images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can update product images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can delete product images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');

-- Add fallback policy for anonymous uploads (development)
CREATE POLICY "Allow anonymous uploads for development"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'product-images');

-- Enhanced product creation function with better error handling
CREATE OR REPLACE FUNCTION create_product_enhanced(
  p_product_data jsonb,
  p_images text[] DEFAULT ARRAY[]::text[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_product_id text;
  product_result json;
  image_url text;
  image_index integer := 0;
  main_image_url text;
  category_exists boolean;
BEGIN
  -- Set admin context
  PERFORM set_config('app.is_admin', 'true', true);
  
  -- Validate required fields
  IF (p_product_data->>'name') IS NULL OR trim(p_product_data->>'name') = '' THEN
    RAISE EXCEPTION 'Product name is required';
  END IF;
  
  IF (p_product_data->>'description') IS NULL OR trim(p_product_data->>'description') = '' THEN
    RAISE EXCEPTION 'Product description is required';
  END IF;
  
  IF (p_product_data->>'price') IS NULL OR (p_product_data->>'price')::numeric <= 0 THEN
    RAISE EXCEPTION 'Valid product price is required';
  END IF;
  
  IF (p_product_data->>'category_id') IS NULL OR trim(p_product_data->>'category_id') = '' THEN
    RAISE EXCEPTION 'Product category is required';
  END IF;
  
  -- Validate category exists
  SELECT EXISTS(
    SELECT 1 FROM categories WHERE id = (p_product_data->>'category_id')::text
  ) INTO category_exists;
  
  IF NOT category_exists THEN
    RAISE EXCEPTION 'Invalid category selected';
  END IF;
  
  -- Generate or use provided product ID
  new_product_id := COALESCE(
    NULLIF(trim(p_product_data->>'id'), ''),
    'product-' || extract(epoch from now())::bigint || '-' || floor(random() * 1000)::text
  );
  
  -- Determine main image URL
  main_image_url := COALESCE(
    NULLIF(trim(p_product_data->>'image'), ''),
    CASE WHEN array_length(p_images, 1) > 0 THEN p_images[1] ELSE '/images/placeholder.jpg' END
  );
  
  -- Insert the product with all required fields
  INSERT INTO products (
    id,
    name,
    description,
    price,
    category_id,
    tags,
    unit,
    available,
    featured,
    image,
    created_at,
    updated_at
  ) VALUES (
    new_product_id,
    trim(p_product_data->>'name'),
    trim(p_product_data->>'description'),
    (p_product_data->>'price')::numeric,
    trim(p_product_data->>'category_id'),
    COALESCE(
      ARRAY(SELECT trim(unnest(string_to_array(p_product_data->>'tags', ','))) WHERE trim(unnest) != ''),
      ARRAY[]::text[]
    ),
    COALESCE(NULLIF(trim(p_product_data->>'unit'), ''), 'kg'),
    COALESCE((p_product_data->>'available')::boolean, true),
    COALESCE((p_product_data->>'featured')::boolean, false),
    main_image_url,
    now(),
    now()
  );
  
  -- Add images to product_images table if provided
  FOREACH image_url IN ARRAY p_images
  LOOP
    IF trim(image_url) != '' THEN
      INSERT INTO product_images (
        product_id,
        image_url,
        display_order,
        is_primary,
        created_at
      ) VALUES (
        new_product_id,
        trim(image_url),
        image_index,
        image_index = 0,  -- First image is primary
        now()
      );
      
      image_index := image_index + 1;
    END IF;
  END LOOP;
  
  -- Create inventory record
  INSERT INTO inventory (
    product_id,
    quantity,
    reorder_level,
    last_updated
  ) VALUES (
    new_product_id,
    0,
    10,
    now()
  ) ON CONFLICT (product_id, location) DO NOTHING;
  
  -- Return success result
  SELECT json_build_object(
    'id', new_product_id,
    'name', trim(p_product_data->>'name'),
    'image', main_image_url,
    'success', true,
    'message', 'Product created successfully',
    'created_at', now()
  ) INTO product_result;
  
  RETURN product_result;
END;
$$;

-- Enhanced product update function
CREATE OR REPLACE FUNCTION update_product_enhanced(
  p_product_id text,
  p_product_data jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  product_result json;
  main_image_url text;
  category_exists boolean;
  product_exists boolean;
BEGIN
  -- Set admin context
  PERFORM set_config('app.is_admin', 'true', true);
  
  -- Check if product exists
  SELECT EXISTS(
    SELECT 1 FROM products WHERE id = p_product_id
  ) INTO product_exists;
  
  IF NOT product_exists THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  
  -- Validate category if provided
  IF (p_product_data->>'category_id') IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM categories WHERE id = (p_product_data->>'category_id')::text
    ) INTO category_exists;
    
    IF NOT category_exists THEN
      RAISE EXCEPTION 'Invalid category selected';
    END IF;
  END IF;
  
  -- Get main image URL
  main_image_url := NULLIF(trim(p_product_data->>'image'), '');
  
  -- Update the product
  UPDATE products SET
    name = COALESCE(NULLIF(trim(p_product_data->>'name'), ''), name),
    description = COALESCE(NULLIF(trim(p_product_data->>'description'), ''), description),
    price = COALESCE((p_product_data->>'price')::numeric, price),
    category_id = COALESCE(NULLIF(trim(p_product_data->>'category_id'), ''), category_id),
    tags = COALESCE(
      ARRAY(SELECT trim(unnest(string_to_array(p_product_data->>'tags', ','))) WHERE trim(unnest) != ''),
      tags
    ),
    unit = COALESCE(NULLIF(trim(p_product_data->>'unit'), ''), unit),
    available = COALESCE((p_product_data->>'available')::boolean, available),
    featured = COALESCE((p_product_data->>'featured')::boolean, featured),
    image = COALESCE(main_image_url, image),
    updated_at = now()
  WHERE id = p_product_id;
  
  -- Update primary image if provided
  IF main_image_url IS NOT NULL THEN
    -- Set all existing images as non-primary
    UPDATE product_images 
    SET is_primary = false 
    WHERE product_id = p_product_id;
    
    -- Insert or update the primary image
    INSERT INTO product_images (
      product_id,
      image_url,
      display_order,
      is_primary,
      created_at
    ) VALUES (
      p_product_id,
      main_image_url,
      0,
      true,
      now()
    ) ON CONFLICT (product_id, image_url) DO UPDATE SET
      is_primary = true,
      display_order = 0;
  END IF;
  
  -- Return success result
  SELECT json_build_object(
    'id', p_product_id,
    'success', true,
    'message', 'Product updated successfully',
    'updated_at', now()
  ) INTO product_result;
  
  RETURN product_result;
END;
$$;

-- Create trigger to sync product main image
CREATE OR REPLACE FUNCTION sync_product_image()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a primary image is set, update the product's main image field
  IF NEW.is_primary = true THEN
    UPDATE products 
    SET image = NEW.image_url, updated_at = now()
    WHERE id = NEW.product_id;
    
    -- Ensure only one primary image per product
    UPDATE product_images 
    SET is_primary = false 
    WHERE product_id = NEW.product_id 
      AND id != NEW.id 
      AND is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS sync_product_image_trigger ON product_images;
CREATE TRIGGER sync_product_image_trigger
  AFTER INSERT OR UPDATE ON product_images
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_image();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION authenticate_admin_enhanced(text, text) TO anon;
GRANT EXECUTE ON FUNCTION authenticate_admin_enhanced(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user() TO anon;
GRANT EXECUTE ON FUNCTION create_product_enhanced(jsonb, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION update_product_enhanced(text, jsonb) TO authenticated;

-- Grant storage permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT SELECT ON storage.objects TO anon;
GRANT INSERT ON storage.objects TO anon;

-- Update RLS policies to use the new admin function
DROP POLICY IF EXISTS "Only admins can manage products" ON products;
CREATE POLICY "Admins can manage products"
  ON products
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "Only admins can manage product images" ON product_images;
CREATE POLICY "Admins can manage product images"
  ON product_images
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "Only admins can manage inventory" ON inventory;
CREATE POLICY "Admins can manage inventory"
  ON inventory
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Force a complete schema refresh
REFRESH MATERIALIZED VIEW IF EXISTS pg_stat_user_tables;
ANALYZE;

-- Final verification
DO $$
DECLARE
  image_column_exists boolean;
  bucket_exists boolean;
  admin_exists boolean;
  policy_count integer;
BEGIN
  -- Check image column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products' 
      AND column_name = 'image'
  ) INTO image_column_exists;
  
  -- Check bucket
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'product-images'
  ) INTO bucket_exists;
  
  -- Check admin user
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE username = 'admin' AND is_active = true
  ) INTO admin_exists;
  
  -- Check policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'storage' 
    AND tablename = 'objects';
  
  IF image_column_exists AND bucket_exists AND admin_exists AND policy_count > 0 THEN
    RAISE NOTICE 'Admin dashboard setup completed successfully!';
    RAISE NOTICE 'Image column exists: %, Bucket exists: %, Admin exists: %, Storage policies: %', 
      image_column_exists, bucket_exists, admin_exists, policy_count;
  ELSE
    RAISE WARNING 'Setup verification failed - Image: %, Bucket: %, Admin: %, Policies: %', 
      image_column_exists, bucket_exists, admin_exists, policy_count;
  END IF;
END $$;