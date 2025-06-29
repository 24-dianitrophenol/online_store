/*
  # Fix Database Schema - Add Missing Image Column

  1. Schema Updates
    - Add missing 'image' column to products table
    - Update existing products with proper image references
    - Ensure data consistency

  2. Data Migration
    - Populate image column from product_images table
    - Set fallback placeholder for products without images

  3. Constraints
    - Add proper defaults and constraints for image column
*/

-- Add the missing image column to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'image'
  ) THEN
    ALTER TABLE products ADD COLUMN image text;
  END IF;
END $$;

-- Update existing products to have proper image references
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
  '/images/placeholder.jpg'
)
WHERE image IS NULL OR image = '';

-- Ensure all products have at least a placeholder image
UPDATE products 
SET image = '/images/placeholder.jpg'
WHERE image IS NULL OR image = '';

-- Set default value for future inserts
ALTER TABLE products ALTER COLUMN image SET DEFAULT '/images/placeholder.jpg';

-- Create function to sync product images with main image field (if not exists)
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

-- Create trigger to automatically sync main image (if not exists)
DROP TRIGGER IF EXISTS sync_product_main_image_trigger ON product_images;
CREATE TRIGGER sync_product_main_image_trigger
  AFTER INSERT OR UPDATE ON product_images
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_main_image();

-- Enhanced product creation function with proper image handling
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
  main_image_url text;
BEGIN
  -- Set admin context
  PERFORM set_config('app.is_admin', 'true', true);
  
  -- Extract product ID or generate one
  new_product_id := COALESCE(
    (p_product_data->>'id')::text,
    'product-' || extract(epoch from now())::bigint || '-' || floor(random() * 1000)::text
  );
  
  -- Determine main image URL
  main_image_url := COALESCE(
    (p_product_data->>'image')::text,
    CASE WHEN array_length(p_images, 1) > 0 THEN p_images[1] ELSE '/images/placeholder.jpg' END
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
    main_image_url
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
    'image', main_image_url,
    'success', true
  ) INTO product_result;
  
  RETURN product_result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_product_with_images(jsonb, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_product_main_image() TO authenticated;

-- Verify the fix by checking if image column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'image'
  ) THEN
    RAISE NOTICE 'Image column successfully added to products table';
  ELSE
    RAISE EXCEPTION 'Failed to add image column to products table';
  END IF;
END $$;