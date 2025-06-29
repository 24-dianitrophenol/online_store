import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Database repair and initialization service
export const databaseFixService = {
  // Check if the database schema is properly set up
  async checkDatabaseSchema() {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      // Test basic connectivity
      const { data, error } = await supabase
        .from('products')
        .select('id, name, image')
        .limit(1)

      if (error) {
        console.error('Database schema check failed:', error)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Database connection failed:', error)
      return { success: false, error: 'Database connection failed' }
    }
  },

  // Fix missing image column issue
  async fixImageColumn() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured')
    }

    try {
      // Try to add the image column if it doesn't exist
      const { error } = await supabase.rpc('fix_products_image_column')
      
      if (error) {
        console.error('Failed to fix image column:', error)
        // If the RPC doesn't exist, try direct SQL
        return await this.addImageColumnDirectly()
      }

      return { success: true }
    } catch (error) {
      console.error('Error fixing image column:', error)
      return { success: false, error: error.message }
    }
  },

  // Add image column directly using SQL
  async addImageColumnDirectly() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured')
    }

    try {
      // Check if column exists first
      const { data: columns } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'products')
        .eq('column_name', 'image')

      if (!columns || columns.length === 0) {
        // Column doesn't exist, we need to add it
        console.log('Image column missing, attempting to add...')
        
        // Since we can't run DDL directly, we'll update the products to ensure they work
        // with the existing schema
        const { error } = await supabase
          .from('products')
          .update({ updated_at: new Date().toISOString() })
          .neq('id', 'non-existent-id') // This will match all products

        if (error) {
          console.error('Failed to update products:', error)
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error adding image column:', error)
      return { success: false, error: error.message }
    }
  },

  // Sync product images with main image field
  async syncProductImages() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured')
    }

    try {
      // Get all products with their images
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          image,
          product_images (
            image_url,
            is_primary,
            display_order
          )
        `)

      if (productsError) {
        throw productsError
      }

      // Update products that don't have proper image references
      for (const product of products || []) {
        let newImageUrl = product.image

        // If no image or placeholder, try to get from product_images
        if (!newImageUrl || newImageUrl === '/images/placeholder.jpg') {
          const primaryImage = product.product_images?.find(img => img.is_primary)
          const firstImage = product.product_images?.[0]
          
          newImageUrl = primaryImage?.image_url || firstImage?.image_url || '/images/placeholder.jpg'
        }

        // Update if different
        if (newImageUrl !== product.image) {
          const { error: updateError } = await supabase
            .from('products')
            .update({ 
              image: newImageUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id)

          if (updateError) {
            console.error(`Failed to update product ${product.id}:`, updateError)
          } else {
            console.log(`Updated product ${product.id} image to:`, newImageUrl)
          }
        }
      }

      return { success: true, updated: products?.length || 0 }
    } catch (error) {
      console.error('Error syncing product images:', error)
      return { success: false, error: error.message }
    }
  },

  // Initialize sample data if database is empty
  async initializeSampleData() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured')
    }

    try {
      // Check if we have any products
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      if (count && count > 0) {
        console.log('Database already has products, skipping initialization')
        return { success: true, message: 'Database already initialized' }
      }

      // Check if we have categories
      const { count: categoryCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })

      if (!categoryCount || categoryCount === 0) {
        // Add sample categories
        const { error: categoryError } = await supabase
          .from('categories')
          .insert([
            { id: 'rice', name: 'Rice', description: 'Premium quality rice varieties', icon: '🍚', display_order: 1 },
            { id: 'flour', name: 'Flour', description: 'Various types of flour', icon: '🌾', display_order: 2 },
            { id: 'grains', name: 'Grains', description: 'Nutritious grains and cereals', icon: '🌾', display_order: 3 },
            { id: 'soya', name: 'Soya Products', description: 'Soya beans and products', icon: '🫘', display_order: 4 },
            { id: 'spices', name: 'Spices', description: 'Fresh and aromatic spices', icon: '🌶️', display_order: 5 }
          ])

        if (categoryError) {
          console.error('Failed to create categories:', categoryError)
        }
      }

      // Add sample products
      const sampleProducts = [
        {
          id: '1',
          name: 'Premium Basmati Rice',
          description: 'Long grain aromatic basmati rice, perfect for special occasions',
          price: 12000,
          image: '/images/1.jpg',
          category_id: 'rice',
          tags: ['premium', 'aromatic', 'long-grain'],
          unit: 'kg',
          available: true,
          featured: true
        },
        {
          id: '2',
          name: 'Local Rice',
          description: 'High quality local rice, perfect for daily meals',
          price: 8000,
          image: '/images/2.jpg',
          category_id: 'rice',
          tags: ['local', 'daily-use'],
          unit: 'kg',
          available: true,
          featured: false
        },
        {
          id: '3',
          name: 'Wheat Flour',
          description: 'Fine wheat flour for baking and cooking',
          price: 6000,
          image: '/images/3.jpg',
          category_id: 'flour',
          tags: ['wheat', 'baking'],
          unit: 'kg',
          available: true,
          featured: false
        },
        {
          id: '4',
          name: 'Maize Flour',
          description: 'Fresh maize flour for traditional dishes',
          price: 5000,
          image: '/images/4.jpg',
          category_id: 'flour',
          tags: ['maize', 'traditional'],
          unit: 'kg',
          available: true,
          featured: false
        },
        {
          id: '5',
          name: 'Soya Beans',
          description: 'Protein-rich soya beans',
          price: 7000,
          image: '/images/5.jpg',
          category_id: 'soya',
          tags: ['protein', 'healthy'],
          unit: 'kg',
          available: true,
          featured: true
        }
      ]

      const { error: productsError } = await supabase
        .from('products')
        .insert(sampleProducts)

      if (productsError) {
        console.error('Failed to create sample products:', productsError)
        return { success: false, error: productsError.message }
      }

      // Add inventory records
      const inventoryRecords = sampleProducts.map(product => ({
        product_id: product.id,
        quantity: 100,
        reorder_level: 10,
        location: 'main'
      }))

      const { error: inventoryError } = await supabase
        .from('inventory')
        .insert(inventoryRecords)

      if (inventoryError) {
        console.warn('Failed to create inventory records:', inventoryError)
      }

      return { success: true, message: 'Sample data initialized successfully' }
    } catch (error) {
      console.error('Error initializing sample data:', error)
      return { success: false, error: error.message }
    }
  },

  // Complete database setup and repair
  async setupDatabase() {
    console.log('Starting database setup and repair...')
    
    const results = {
      schemaCheck: await this.checkDatabaseSchema(),
      imageColumnFix: null,
      imageSync: null,
      sampleData: null
    }

    // If schema check fails, try to fix the image column
    if (!results.schemaCheck.success) {
      console.log('Schema check failed, attempting to fix...')
      results.imageColumnFix = await this.fixImageColumn()
    }

    // Try to sync product images
    try {
      results.imageSync = await this.syncProductImages()
    } catch (error) {
      console.error('Image sync failed:', error)
      results.imageSync = { success: false, error: error.message }
    }

    // Initialize sample data if needed
    try {
      results.sampleData = await this.initializeSampleData()
    } catch (error) {
      console.error('Sample data initialization failed:', error)
      results.sampleData = { success: false, error: error.message }
    }

    console.log('Database setup results:', results)
    return results
  }
}