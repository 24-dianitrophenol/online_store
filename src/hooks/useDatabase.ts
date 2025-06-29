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

// Enhanced products hook with real-time sync
export const useProducts = () => {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await productService.getAll()
      setProducts(data.map(convertProduct))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch products'
      setError(errorMessage)
      console.error('Error fetching products:', err)
      
      // If Supabase is not configured, don't treat it as an error
      if (!isSupabaseConfigured()) {
        setError(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()

    // Set up real-time sync if Supabase is configured
    let unsubscribe: (() => void) | undefined

    if (isSupabaseConfigured()) {
      unsubscribe = syncService.subscribeToProductChanges((payload) => {
        console.log('Product change detected:', payload)
        fetchProducts() // Refresh products on any change
      })
    }

    // Listen for manual refresh events
    const handleRefresh = () => fetchProducts()
    window.addEventListener('refreshProducts', handleRefresh)
    window.addEventListener('productUpdated', handleRefresh)
    window.addEventListener('productDeleted', handleRefresh)

    return () => {
      unsubscribe?.()
      window.removeEventListener('refreshProducts', handleRefresh)
      window.removeEventListener('productUpdated', handleRefresh)
      window.removeEventListener('productDeleted', handleRefresh)
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
        const data = await categoryService.getAll()
        setCategories(data.map(convertCategory))
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories'
        setError(errorMessage)
        console.error('Error fetching categories:', err)
        
        // If Supabase is not configured, don't treat it as an error
        if (!isSupabaseConfigured()) {
          setError(null)
        }
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

// Enhanced admin products hook with real-time sync
export const useAdminProducts = () => {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await productService.getAllForAdmin()
      setProducts(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch admin products'
      setError(errorMessage)
      console.error('Error fetching admin products:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createProduct = async (productData: any, images: string[] = []) => {
    try {
      await productService.create(productData, images)
      await fetchProducts() // Refresh the list
      syncService.triggerProductRefresh() // Trigger refresh on main website
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create product'
      throw new Error(errorMessage)
    }
  }

  const updateProduct = async (id: string, updates: any) => {
    try {
      await productService.update(id, updates)
      await fetchProducts() // Refresh the list
      syncService.triggerProductRefresh() // Trigger refresh on main website
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update product'
      throw new Error(errorMessage)
    }
  }

  const deleteProduct = async (id: string) => {
    try {
      await productService.delete(id)
      await fetchProducts() // Refresh the list
      syncService.triggerProductRefresh() // Trigger refresh on main website
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete product'
      throw new Error(errorMessage)
    }
  }

  useEffect(() => {
    fetchProducts()

    // Set up real-time sync for admin
    let unsubscribe: (() => void) | undefined

    if (isSupabaseConfigured()) {
      unsubscribe = syncService.subscribeToProductChanges((payload) => {
        console.log('Admin: Product change detected:', payload)
        fetchProducts() // Refresh admin products on any change
      })
    }

    // Listen for manual refresh events
    const handleRefresh = () => fetchProducts()
    window.addEventListener('refreshProducts', handleRefresh)

    return () => {
      unsubscribe?.()
      window.removeEventListener('refreshProducts', handleRefresh)
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
      setIsConfigured(isSupabaseConfigured())
    }

    // Check status periodically
    const interval = setInterval(checkStatus, 5000)

    // Listen for configuration changes
    window.addEventListener('supabaseConfigured', checkStatus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('supabaseConfigured', checkStatus)
    }
  }, [])

  return { isConfigured }
}