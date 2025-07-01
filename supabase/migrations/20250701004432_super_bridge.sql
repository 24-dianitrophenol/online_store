/*
  # Fix Product Image Access for Main Website

  1. Schema Updates
    - Ensure products table has proper image column
    - Create function to sync primary images with products table
    - Update existing products with their primary images

  2. Image Management
    - Sync product_images table with products.image column
    - Ensure primary images are properly referenced
    - Add triggers for automatic image sync

  3. Data Consistency
    - Update all existing products with their primary image URLs
    - Ensure fallback to placeholder for products without images
*/

-- Ensure the image column exists in products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products' 
      AND column_name = 'image'
  ) THEN
    ALTER TABLE products ADD COLUMN image text DEFAULT '/images/placeholder.jpg';
    RAISE NOTICE 'Added image column to products table';
  END IF;
END $$;

-- Set default value for image column
ALTER TABLE products ALTER COLUMN image SET DEFAULT '/images/placeholder.jpg';

-- Function to sync product images with main image field
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

-- Function to update product image when primary image is deleted
CREATE OR REPLACE FUNCTION handle_primary_image_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_image_url text;
BEGIN
  -- If a primary image was deleted, find the next available image
  IF OLD.is_primary = true THEN
    SELECT image_url INTO next_image_url
    FROM product_images 
    WHERE product_id = OLD.product_id 
      AND id != OLD.id
    ORDER BY display_order ASC
    LIMIT 1;
    
    -- Update product with next available image or placeholder
    UPDATE products 
    SET image = COALESCE(next_image_url, '/images/placeholder.jpg'),
        updated_at = now()
    WHERE id = OLD.product_id;
    
    -- Set the next image as primary if it exists
    IF next_image_url IS NOT NULL THEN
      UPDATE product_images 
      SET is_primary = true 
      WHERE product_id = OLD.product_id 
        AND image_url = next_image_url;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create trigger for image deletion
DROP TRIGGER IF EXISTS handle_primary_image_deletion_trigger ON product_images;
CREATE TRIGGER handle_primary_image_deletion_trigger
  BEFORE DELETE ON product_images
  FOR EACH ROW
  EXECUTE FUNCTION handle_primary_image_deletion();

-- Update all existing products with their primary image URLs
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

-- Update the product creation function to handle images properly
CREATE OR REPLACE FUNCTION create_product_enhanced(
  p_admin_id uuid,
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

-- Update the product update function to handle images properly
CREATE OR REPLACE FUNCTION update_product_enhanced(
  p_admin_id uuid,
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION sync_product_main_image() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_primary_image_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION create_product_enhanced(uuid, jsonb, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION update_product_enhanced(uuid, text, jsonb) TO authenticated;

-- Verify the fix by checking if all products have proper image references
DO $$
DECLARE
  products_without_images integer;
  total_products integer;
BEGIN
  SELECT COUNT(*) INTO total_products FROM products;
  
  SELECT COUNT(*) INTO products_without_images 
  FROM products 
  WHERE image IS NULL OR image = '';
  
  IF products_without_images = 0 THEN
    RAISE NOTICE 'All % products have proper image references', total_products;
  ELSE
    RAISE WARNING '% out of % products are missing image references', products_without_images, total_products;
  END IF;
END $$;