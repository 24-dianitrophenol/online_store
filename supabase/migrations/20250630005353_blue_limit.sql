/*
  # Fix Missing Image Column in Products Table

  1. Schema Fix
    - Add missing 'image' column to products table
    - Set proper default value
    - Update existing products

  2. Safety
    - Use IF NOT EXISTS to avoid conflicts
    - Handle existing data properly
    - Ensure no data loss
*/

-- Add the missing image column to products table
DO $$
BEGIN
  -- Check if image column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products' 
      AND column_name = 'image'
  ) THEN
    -- Add the image column with default value
    ALTER TABLE products ADD COLUMN image text DEFAULT '/images/placeholder.jpg';
    RAISE NOTICE 'Added image column to products table';
  ELSE
    RAISE NOTICE 'Image column already exists in products table';
  END IF;
  
  -- Ensure the column has a proper default
  ALTER TABLE products ALTER COLUMN image SET DEFAULT '/images/placeholder.jpg';
  
  -- Update any existing products that have null or empty image values
  UPDATE products 
  SET image = '/images/placeholder.jpg'
  WHERE image IS NULL OR image = '';
  
  RAISE NOTICE 'Image column setup completed successfully';
END $$;

-- Verify the column was added correctly
DO $$
DECLARE
  column_exists boolean;
  products_count integer;
  products_with_images integer;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products' 
      AND column_name = 'image'
  ) INTO column_exists;
  
  -- Count total products
  SELECT COUNT(*) INTO products_count FROM products;
  
  -- Count products with images
  SELECT COUNT(*) INTO products_with_images 
  FROM products 
  WHERE image IS NOT NULL AND image != '';
  
  IF column_exists THEN
    RAISE NOTICE 'SUCCESS: Image column exists. Total products: %, Products with images: %', 
      products_count, products_with_images;
  ELSE
    RAISE EXCEPTION 'FAILED: Image column was not created properly';
  END IF;
END $$;

-- Force a schema refresh
ANALYZE products;

-- Update the product creation function to ensure it works with the image column
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
  
  -- Insert the product with all required fields including image
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
      ARRAY(SELECT trim(t) FROM unnest(string_to_array(p_product_data->>'tags', ',')) AS t WHERE trim(t) != ''),
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

-- Update the product update function to work with the image column
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
  
  -- Update the product including the image field
  UPDATE products SET
    name = COALESCE(NULLIF(trim(p_product_data->>'name'), ''), name),
    description = COALESCE(NULLIF(trim(p_product_data->>'description'), ''), description),
    price = COALESCE((p_product_data->>'price')::numeric, price),
    category_id = COALESCE(NULLIF(trim(p_product_data->>'category_id'), ''), category_id),
    tags = COALESCE(
      ARRAY(SELECT trim(t) FROM unnest(string_to_array(p_product_data->>'tags', ',')) AS t WHERE trim(t) != ''),
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
GRANT EXECUTE ON FUNCTION create_product_enhanced(jsonb, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION update_product_enhanced(text, jsonb) TO authenticated;

-- Final check to ensure everything is working
DO $$
DECLARE
  test_result json;
BEGIN
  -- Test that we can query the products table with the image column
  PERFORM id, name, image FROM products LIMIT 1;
  RAISE NOTICE 'SUCCESS: Products table with image column is working correctly';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'FAILED: Products table query failed - %', SQLERRM;
END $$;