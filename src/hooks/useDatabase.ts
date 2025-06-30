import { useState, useEffect, useCallback } from 'react'
import { productService, categoryService, syncService } from '../services/database'
import { isSupabaseConfigured } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type Product = Database['public']['Tables']['products']['Row'] & {
  categories?: { id: string; name: string; icon?: string };
  product_images?: Array<{
    id: string;
    image_url: string;
    alt_text?: string;
    display_order: number;
    is_primary: boolean;
  }>;
  inventory?: Array<{
    quantity: number;
    reserved_quantity: number;
    reorder_level: number;
  }>;
};

type Category = Database['public']['Tables']['categories']['Row'];

// Convert database types to app types
const convertProduct = (dbProduct: Product): any => ({
  id: dbProduct.id,
  name: dbProduct.name,
  description: dbProduct.description,
  price: dbProduct.price,
  image: dbProduct.image || (dbProduct.product_images && dbProduct.product_images.length > 0 
    ? dbProduct.product_images.find(img => img.is_primary)?.image_url || dbProduct.product_images[0].image_url
    : '/images/placeholder.jpg'),
  category: dbProduct.category_id,
  tags: dbProduct.tags || [],
  available: dbProduct.available,
  featured: dbProduct.featured,
  rating: dbProduct.rating,
  unit: dbProduct.unit,
  bulkPricing: dbProduct.bulk_pricing || []
})

const convertCategory = (dbCategory: Category): any => ({
  id: dbCategory.id,
  name: dbCategory.name,
  icon: dbCategory.icon
})

// Enhanced products hook with immediate real-time sync
export const useProducts = () => {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async (isRetry = false) => {
    try {
      if (!isRetry) {
        setLoading(true)
      }
      setError(null)
      
      console.log('🔄 Fetching products from database...')
      
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured. Please connect to Supabase first.')
      }
      
      const data = await productService.getAll()
      const convertedProducts = data.map(convertProduct)
      
      console.log(`✅ Loaded ${convertedProducts.length} products`)
      setProducts(convertedProducts)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch products'
      console.error('❌ Error fetching products:', err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()

    // Set up real-time sync
    let unsubscribe: (() => void) | undefined

    if (isSupabaseConfigured()) {
      console.log('🔄 Setting up real-time product subscription for main website...')
      unsubscribe = syncService.subscribeToProductChanges((payload) => {
        console.log('📡 Main website: Product change detected:', payload)
        fetchProducts(true) // Refresh products on any change
      })
    }

    // Listen for manual refresh events with enhanced logging
    const handleRefresh = () => {
      console.log('🔄 Manual refresh triggered for main website')
      fetchProducts(true)
    }
    
    const handleProductUpdated = () => {
      console.log('📝 Product updated event received, refreshing main website...')
      fetchProducts(true)
    }
    
    const handleProductDeleted = () => {
      console.log('🗑️ Product deleted event received, refreshing main website...')
      fetchProducts(true)
    }
    
    const handleProductCreated = () => {
      console.log('🚀 Product created event received, refreshing main website...')
      fetchProducts(true)
    }

    const handleForceRefresh = () => {
      console.log('⚡ Force refresh triggered for main website')
      fetchProducts(true)
    }

    // Add all event listeners
    window.addEventListener('refreshProducts', handleRefresh)
    window.addEventListener('productUpdated', handleProductUpdated)
    window.addEventListener('productDeleted', handleProductDeleted)
    window.addEventListener('productCreated', handleProductCreated)
    window.addEventListener('forceProductRefresh', handleForceRefresh)

    return () => {
      unsubscribe?.()
      window.removeEventListener('refreshProducts', handleRefresh)
      window.removeEventListener('productUpdated', handleProductUpdated)
      window.removeEventListener('productDeleted', handleProductDeleted)
      window.removeEventListener('productCreated', handleProductCreated)
      window.removeEventListener('forceProductRefresh', handleForceRefresh)
    }
  }, [fetchProducts])

  return { products, loading, error, refetch: fetchProducts }
}

export const useCategories = () => {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
          throw new Error('Supabase is not configured. Please connect to Supabase first.')
        }
        
        const data = await categoryService.getAll()
        setCategories(data.map(convertCategory))
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories'
        setError(errorMessage)
        console.error('Error fetching categories:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  return { categories, loading, error }
}

// Hook for real-time product updates
export const useProductUpdates = () => {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const triggerUpdate = useCallback(() => {
    setLastUpdate(new Date())
    syncService.triggerProductRefresh()
  }, [])

  return { lastUpdate, triggerUpdate }
}

// Enhanced admin products hook with immediate real-time sync
export const useAdminProducts = () => {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 Admin: Fetching products from database...')
      
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured. Please connect to Supabase first.')
      }
      
      const data = await productService.getAllForAdmin()
      console.log(`✅ Admin: Loaded ${data.length} products`)
      setProducts(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch admin products'
      setError(errorMessage)
      console.error('❌ Admin: Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createProduct = async (productData: any, images: string[] = []) => {
    try {
      console.log('🚀 Admin: Creating product:', productData, images)
      await productService.create(productData, images)
      await fetchProducts() // Refresh the admin list
      syncService.triggerProductRefresh() // Trigger refresh on main website
      console.log('✅ Admin: Product created and all lists refreshed')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create product'
      console.error('❌ Admin: Create product error:', err)
      throw new Error(errorMessage)
    }
  }

  const updateProduct = async (id: string, updates: any) => {
    try {
      console.log('📝 Admin: Updating product:', id, updates)
      await productService.update(id, updates)
      await fetchProducts() // Refresh the admin list
      syncService.triggerProductRefresh() // Trigger refresh on main website
      console.log('✅ Admin: Product updated and all lists refreshed')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update product'
      console.error('❌ Admin: Update product error:', err)
      throw new Error(errorMessage)
    }
  }

  const deleteProduct = async (id: string) => {
    try {
      console.log('🗑️ Admin: Deleting product:', id)
      await productService.delete(id)
      await fetchProducts() // Refresh the admin list
      syncService.triggerProductRefresh() // Trigger refresh on main website
      console.log('✅ Admin: Product deleted and all lists refreshed')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete product'
      console.error('❌ Admin: Delete product error:', err)
      throw new Error(errorMessage)
    }
  }

  useEffect(() => {
    fetchProducts()

    // Set up real-time sync for admin with enhanced logging
    let unsubscribe: (() => void) | undefined

    if (isSupabaseConfigured()) {
      console.log('🔄 Setting up real-time product subscription for admin dashboard...')
      unsubscribe = syncService.subscribeToProductChanges((payload) => {
        console.log('📡 Admin: Product change detected:', payload)
        fetchProducts() // Refresh admin products on any change
      })
    }

    // Listen for manual refresh events with enhanced logging
    const handleRefresh = () => {
      console.log('🔄 Admin: Manual refresh triggered')
      fetchProducts()
    }

    const handleForceRefresh = () => {
      console.log('⚡ Admin: Force refresh triggered')
      fetchProducts()
    }

    window.addEventListener('refreshProducts', handleRefresh)
    window.addEventListener('forceProductRefresh', handleForceRefresh)

    return () => {
      unsubscribe?.()
      window.removeEventListener('refreshProducts', handleRefresh)
      window.removeEventListener('forceProductRefresh', handleForceRefresh)
    }
  }, [fetchProducts])

  return { 
    products, 
    loading, 
    error, 
    refetch: fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct
  }
}

// Hook for Supabase connection status
export const useSupabaseStatus = () => {
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured())

  useEffect(() => {
    const checkStatus = () => {
      const configured = isSupabaseConfigured()
      setIsConfigured(configured)
    }

    checkStatus()

    // Check status periodically
    const interval = setInterval(checkStatus, 10000)

    // Listen for configuration changes
    window.addEventListener('supabaseConfigured', checkStatus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('supabaseConfigured', checkStatus)
    }
  }, [])

  return { isConfigured }
}