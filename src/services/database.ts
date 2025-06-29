import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type Tables = Database['public']['Tables']
type Product = Tables['products']['Row']
type Category = Tables['categories']['Row']
type ProductImage = Tables['product_images']['Row']
type Inventory = Tables['inventory']['Row']
type AdminUser = Tables['admin_users']['Row']
type Order = Tables['orders']['Row']
type OrderItem = Tables['order_items']['Row']
type BusinessAnalytics = Tables['business_analytics']['Row']

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return url && key && !url.includes('your-project-ref') && !key.includes('your-anon-key')
}

// Admin Authentication
export const adminAuthService = {
  async signIn(username: string, password: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      console.log('Attempting admin authentication...')
      
      // Set admin context before authentication
      await supabase.rpc('set_admin_context')
      
      // Use existing authenticate_admin function
      const { data, error } = await supabase
        .rpc('authenticate_admin', { 
          p_username: username, 
          p_password: password 
        })

      if (error) {
        console.error('Authentication RPC error:', error)
        throw new Error('Invalid username or password')
      }

      if (!data) {
        throw new Error('Invalid username or password')
      }

      // Parse the JSON response if it's a string
      const admin = typeof data === 'string' ? JSON.parse(data) : data
      console.log('Admin authenticated successfully:', admin.username)

      // Store admin info in localStorage with authentication flag
      localStorage.setItem('admin_user', JSON.stringify(admin))
      localStorage.setItem('admin_authenticated', 'true')

      // Update last login
      try {
        await supabase
          .from('admin_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', admin.id)
      } catch (updateError) {
        console.warn('Failed to update last login:', updateError)
      }

      return { user: null, admin }
    } catch (error) {
      console.error('Sign in error:', error)
      await supabase.rpc('clear_admin_context')
      throw error
    }
  },

  async signOut() {
    try {
      // Clear admin context
      await supabase.rpc('clear_admin_context')
      
      // Clear localStorage
      localStorage.removeItem('admin_user')
      localStorage.removeItem('admin_authenticated')
      
      // Sign out from Supabase auth
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.warn('Supabase signout error:', error)
      }
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  },

  async getCurrentAdmin() {
    try {
      // Check localStorage first
      const savedAdmin = localStorage.getItem('admin_user')
      const isAuthenticated = localStorage.getItem('admin_authenticated')
      
      if (savedAdmin && isAuthenticated === 'true') {
        return JSON.parse(savedAdmin)
      }
      return null
    } catch (error) {
      console.error('Get current admin error:', error)
      return null
    }
  }
}

// Enhanced Supabase client with admin context
const getAuthenticatedClient = async () => {
  const isAdminAuthenticated = localStorage.getItem('admin_authenticated') === 'true'
  
  if (isAdminAuthenticated) {
    // Set admin context for this session
    try {
      await supabase.rpc('set_admin_context')
    } catch (error) {
      console.warn('Failed to set admin context:', error)
    }
  }
  
  return supabase
}

// Helper function to safely update products without the image column
const safeProductUpdate = async (client: any, id: string, updates: any) => {
  try {
    // First, try with all fields including image
    const { data, error } = await client
      .from('products')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      // If error mentions image column, try without it
      if (error.message?.includes("'image' column") || error.code === 'PGRST204') {
        console.warn('Image column not found in schema, updating without image field')
        
        // Remove image from updates and try again
        const { image, ...updatesWithoutImage } = updates
        
        const { data: retryData, error: retryError } = await client
          .from('products')
          .update({
            ...updatesWithoutImage,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single()

        if (retryError) throw retryError

        // If we had an image to update, handle it separately via product_images table
        if (image) {
          try {
            await handleProductImageUpdate(client, id, image)
          } catch (imageError) {
            console.warn('Failed to update product image separately:', imageError)
          }
        }

        return retryData
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in safeProductUpdate:', error)
    throw error
  }
}

// Helper function to handle product image updates via product_images table
const handleProductImageUpdate = async (client: any, productId: string, imageUrl: string) => {
  try {
    // First, set all existing images as non-primary
    await client
      .from('product_images')
      .update({ is_primary: false })
      .eq('product_id', productId)

    // Then insert or update the primary image
    const { error: upsertError } = await client
      .from('product_images')
      .upsert({
        product_id: productId,
        image_url: imageUrl,
        is_primary: true,
        display_order: 0
      }, {
        onConflict: 'product_id,image_url'
      })

    if (upsertError) {
      console.warn('Failed to upsert product image:', upsertError)
    }
  } catch (error) {
    console.error('Error handling product image update:', error)
    throw error
  }
}

// Product services with real-time sync
export const productService = {
  async getAll() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            id,
            name,
            icon
          ),
          product_images (
            id,
            image_url,
            alt_text,
            display_order,
            is_primary
          ),
          inventory (
            quantity,
            reserved_quantity,
            reorder_level
          )
        `)
        .eq('available', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching products:', error)
      throw error
    }
  },

  async getAllForAdmin() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      const { data, error } = await client
        .from('products')
        .select(`
          *,
          categories (
            id,
            name,
            icon
          ),
          product_images (
            id,
            image_url,
            alt_text,
            display_order,
            is_primary
          ),
          inventory (
            quantity,
            reserved_quantity,
            reorder_level
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching admin products:', error)
      throw error
    }
  },

  async getById(id: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            id,
            name,
            icon
          ),
          product_images (
            id,
            image_url,
            alt_text,
            display_order,
            is_primary
          ),
          inventory (
            quantity,
            reserved_quantity,
            reorder_level
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching product:', error)
      throw error
    }
  },

  async create(product: Tables['products']['Insert'], images: string[] = []) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      // Ensure admin is authenticated
      const admin = await adminAuthService.getCurrentAdmin()
      if (!admin) {
        throw new Error('Admin authentication required')
      }

      const client = await getAuthenticatedClient()
      
      console.log('Creating product:', product)
      
      // Use the enhanced function for creating products with images
      const { data, error } = await client.rpc('create_product_with_images', {
        p_product_data: product,
        p_images: images
      })

      if (error) {
        console.error('Product creation error:', error)
        throw new Error(`Failed to create product: ${error.message}`)
      }

      console.log('Product created successfully:', data)
      return data
    } catch (error) {
      console.error('Error creating product:', error)
      throw error
    }
  },

  async update(id: string, updates: Tables['products']['Update']) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      
      // Use the safe update function that handles schema mismatches
      const data = await safeProductUpdate(client, id, updates)
      
      // Trigger a refresh event for real-time sync
      window.dispatchEvent(new CustomEvent('productUpdated', { detail: { id, data } }))
      
      return data
    } catch (error) {
      console.error('Error updating product:', error)
      
      // Provide more specific error messages
      if (error.message?.includes("'image' column")) {
        throw new Error('Database schema mismatch detected. Please refresh your Supabase schema cache in the dashboard.')
      } else if (error.code === 'PGRST204') {
        throw new Error('Column not found in database schema. Please check your database configuration.')
      }
      
      throw error
    }
  },

  async delete(id: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      
      const { error } = await client
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // Trigger a refresh event for real-time sync
      window.dispatchEvent(new CustomEvent('productDeleted', { detail: { id } }))
      
      return true
    } catch (error) {
      console.error('Error deleting product:', error)
      throw error
    }
  }
}

// Category services
export const categoryService = {
  async getAll() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching categories:', error)
      throw error
    }
  },

  async getAllForAdmin() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      const { data, error } = await client
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching admin categories:', error)
      throw error
    }
  }
}

// Product Images services
export const productImageService = {
  async add(productId: string, imageUrl: string, altText?: string, isPrimary = false) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      
      // If this is primary, unset other primary images
      if (isPrimary) {
        await client
          .from('product_images')
          .update({ is_primary: false })
          .eq('product_id', productId)
      }

      const { data, error } = await client
        .from('product_images')
        .insert({
          product_id: productId,
          image_url: imageUrl,
          alt_text: altText,
          is_primary: isPrimary
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error adding product image:', error)
      throw error
    }
  }
}

// Inventory services
export const inventoryService = {
  async getByProductId(productId: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      const { data, error } = await client
        .from('inventory')
        .select('*')
        .eq('product_id', productId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching inventory:', error)
      throw error
    }
  },

  async update(productId: string, updates: Tables['inventory']['Update']) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      const { data, error } = await client
        .from('inventory')
        .update(updates)
        .eq('product_id', productId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating inventory:', error)
      throw error
    }
  },

  async getLowStock(threshold?: number) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      let query = client
        .from('inventory')
        .select(`
          *,
          products (
            id,
            name
          )
        `)

      if (threshold) {
        query = query.lt('quantity', threshold)
      } else {
        query = query.lt('quantity', 10) // Default threshold
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching low stock items:', error)
      return []
    }
  }
}

// Order services
export const orderService = {
  async getAll() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      const { data, error } = await client
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              id,
              name,
              image
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching orders:', error)
      return []
    }
  },

  async getRecent(limit = 10) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      const { data, error } = await client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching recent orders:', error)
      return []
    }
  },

  async updateStatus(orderId: string, status: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      const { data, error } = await client
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating order status:', error)
      throw error
    }
  }
}

// Analytics services
export const analyticsService = {
  async getDashboardStats() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      
      // Get basic stats
      const { count: totalProducts } = await client
        .from('products')
        .select('*', { count: 'exact', head: true })

      const { count: activeProducts } = await client
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('available', true)

      // Get low stock items
      const lowStockItems = await inventoryService.getLowStock(10)

      // Get recent orders
      const recentOrders = await orderService.getRecent(5)

      // Get order analytics
      const { data: orderAnalytics } = await client.rpc('get_order_analytics')

      return {
        today: orderAnalytics || { total_revenue: 0, total_orders: 0, total_customers: 0 },
        monthly: [],
        totalProducts: totalProducts || 0,
        activeProducts: activeProducts || 0,
        lowStockItems,
        recentOrders
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      return {
        today: { total_revenue: 0, total_orders: 0, total_customers: 0 },
        monthly: [],
        totalProducts: 0,
        activeProducts: 0,
        lowStockItems: [],
        recentOrders: []
      }
    }
  },

  async getBusinessAnalytics(startDate?: string, endDate?: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      let query = client
        .from('business_analytics')
        .select('*')
        .order('date', { ascending: false })

      if (startDate) {
        query = query.gte('date', startDate)
      }
      if (endDate) {
        query = query.lte('date', endDate)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching business analytics:', error)
      return []
    }
  }
}

// Real-time sync utilities
export const syncService = {
  // Subscribe to product changes for real-time updates
  subscribeToProductChanges(callback: (payload: any) => void) {
    if (!isSupabaseConfigured()) {
      console.warn('Real-time sync not available without Supabase configuration')
      return () => {}
    }

    const subscription = supabase
      .channel('products_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products' }, 
        callback
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  },

  // Trigger manual refresh across all components
  triggerProductRefresh() {
    window.dispatchEvent(new CustomEvent('refreshProducts'))
  }
}

// Export configuration status
export const getSupabaseStatus = () => ({
  configured: isSupabaseConfigured(),
  url: import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
})