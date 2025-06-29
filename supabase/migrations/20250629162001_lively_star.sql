/*
  # Storage RLS and Bucket Configuration

  1. Storage Setup
    - Configure existing product-images bucket
    - Set up proper RLS policies for storage
    - Enable public access for viewing images
    - Restrict upload/delete to authenticated admins

  2. Security
    - Public read access for product images
    - Admin-only write access for image management
    - Proper file type and size restrictions

  3. Integration
    - Ensure bucket exists and is properly configured
    - Set up policies for seamless admin-website integration
*/

-- Ensure the product-images bucket exists and is properly configured
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 
  'product-images', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;

-- Create comprehensive storage policies for product images

-- Allow anyone (including anonymous users) to view product images
CREATE POLICY "Anyone can view product images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- Allow authenticated users with admin context to upload images
CREATE POLICY "Admins can upload product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (
      -- Check if user has admin context set
      COALESCE(current_setting('app.is_admin', true), 'false') = 'true'
      OR
      -- Fallback: check if user exists in admin_users table
      EXISTS (
        SELECT 1 FROM admin_users
        WHERE id::text = auth.uid()::text
          AND is_active = true
      )
    )
  );

-- Allow authenticated admins to update images
CREATE POLICY "Admins can update product images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (
      COALESCE(current_setting('app.is_admin', true), 'false') = 'true'
      OR
      EXISTS (
        SELECT 1 FROM admin_users
        WHERE id::text = auth.uid()::text
          AND is_active = true
      )
    )
  );

-- Allow authenticated admins to delete images
CREATE POLICY "Admins can delete product images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (
      COALESCE(current_setting('app.is_admin', true), 'false') = 'true'
      OR
      EXISTS (
        SELECT 1 FROM admin_users
        WHERE id::text = auth.uid()::text
          AND is_active = true
      )
    )
  );

-- Create function to sync product images with main image field
CREATE OR REPLACE FUNCTION sync_product_main_image()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a new primary image is added, update the product's main image field
  IF NEW.is_primary = true THEN
    UPDATE products 
    SET image = NEW.image_url,
        updated_at = now()
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

-- Create trigger to automatically sync main image
DROP TRIGGER IF EXISTS sync_product_main_image_trigger ON product_images;
CREATE TRIGGER sync_product_main_image_trigger
  AFTER INSERT OR UPDATE ON product_images
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_main_image();

-- Create function to handle product image cleanup
CREATE OR REPLACE FUNCTION cleanup_product_images()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a product is deleted, clean up its images
  DELETE FROM product_images WHERE product_id = OLD.id;
  RETURN OLD;
END;
$$;

-- Create trigger for product image cleanup
DROP TRIGGER IF EXISTS cleanup_product_images_trigger ON products;
CREATE TRIGGER cleanup_product_images_trigger
  BEFORE DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_product_images();

-- Enhanced product creation function with image handling
CREATE OR REPLACE FUNCTION create_product_with_images(
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
BEGIN
  -- Set admin context
  PERFORM set_config('app.is_admin', 'true', true);
  
  -- Extract product ID or generate one
  new_product_id := COALESCE(
    (p_product_data->>'id')::text,
    'product-' || extract(epoch from now())::bigint || '-' || floor(random() * 1000)::text
  );
  
  -- Insert the product
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
    image
  ) VALUES (
    new_product_id,
    (p_product_data->>'name')::text,
    (p_product_data->>'description')::text,
    (p_product_data->>'price')::numeric,
    (p_product_data->>'category_id')::text,
    COALESCE((p_product_data->>'tags')::text[], ARRAY[]::text[]),
    COALESCE((p_product_data->>'unit')::text, 'kg'),
    COALESCE((p_product_data->>'available')::boolean, true),
    COALESCE((p_product_data->>'featured')::boolean, false),
    COALESCE((p_product_data->>'image')::text, '/images/placeholder.jpg')
  );
  
  -- Add images if provided
  FOREACH image_url IN ARRAY p_images
  LOOP
    INSERT INTO product_images (
      product_id,
      image_url,
      display_order,
      is_primary
    ) VALUES (
      new_product_id,
      image_url,
      image_index,
      image_index = 0  -- First image is primary
    );
    
    image_index := image_index + 1;
  END LOOP;
  
  -- Create inventory record
  INSERT INTO inventory (
    product_id,
    quantity,
    reorder_level
  ) VALUES (
    new_product_id,
    0,
    10
  ) ON CONFLICT (product_id, location) DO NOTHING;
  
  -- Return the created product
  SELECT json_build_object(
    'id', new_product_id,
    'name', (p_product_data->>'name')::text,
    'success', true
  ) INTO product_result;
  
  RETURN product_result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_product_with_images(jsonb, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_product_main_image() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_product_images() TO authenticated;

-- Update existing products to ensure they have proper image references
UPDATE products 
SET image = COALESCE(
  (
    SELECT image_url 
    FROM product_images 
    WHERE product_id = products.id 
      AND is_primary = true 
    LIMIT 1
  ),
  (
    SELECT image_url 
    FROM product_images 
    WHERE product_id = products.id 
    ORDER BY display_order ASC 
    LIMIT 1
  ),
  image,
  '/images/placeholder.jpg'
)
WHERE image IS NULL OR image = '';

-- Ensure all products have at least a placeholder image
UPDATE products 
SET image = '/images/placeholder.jpg'
WHERE image IS NULL OR image = '';