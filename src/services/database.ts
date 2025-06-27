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

// Admin Authentication - Use existing functions
export const adminAuthService = {
  async signIn(username: string, password: string) {
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

// Product services
export const productService = {
  async getAll() {
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
      return []
    }
  },

  async getAllForAdmin() {
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
      return []
    }
  },

  async getById(id: string) {
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
    try {
      // Ensure admin is authenticated
      const admin = await adminAuthService.getCurrentAdmin()
      if (!admin) {
        throw new Error('Admin authentication required')
      }

      const client = await getAuthenticatedClient()
      
      console.log('Creating product:', product)
      
      const { data, error } = await client
        .from('products')
        .insert(product)
        .select()
        .single()

      if (error) {
        console.error('Product creation error:', error)
        throw new Error(`Failed to create product: ${error.message}`)
      }

      console.log('Product created successfully:', data)

      // Add images if provided
      if (images.length > 0) {
        const imageInserts = images.map((url, index) => ({
          product_id: data.id,
          image_url: url,
          display_order: index,
          is_primary: index === 0
        }))

        const { error: imageError } = await client
          .from('product_images')
          .insert(imageInserts)

        if (imageError) {
          console.warn('Failed to add product images:', imageError)
        }
      }

      // Create inventory record
      const { error: inventoryError } = await client
        .from('inventory')
        .insert({
          product_id: data.id,
          quantity: 0,
          reorder_level: 10
        })

      if (inventoryError) {
        console.warn('Failed to create inventory record:', inventoryError)
      }

      return data
    } catch (error) {
      console.error('Error creating product:', error)
      throw error
    }
  },

  async update(id: string, updates: Tables['products']['Update']) {
    try {
      const client = await getAuthenticatedClient()
      
      const { data, error } = await client
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating product:', error)
      throw error
    }
  },

  async delete(id: string) {
    try {
      const client = await getAuthenticatedClient()
      
      const { error } = await client
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error
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
      return []
    }
  },

  async getAllForAdmin() {
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
      return []
    }
  }
}

// Product Images services
export const productImageService = {
  async add(productId: string, imageUrl: string, altText?: string, isPrimary = false) {
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

// Enhanced image upload helper with better error handling
export const uploadImage = async (file: File, bucket: string = 'product-images'): Promise<string> => {
  try {
    // Ensure admin is authenticated
    const admin = await adminAuthService.getCurrentAdmin()
    if (!admin) {
      throw new Error('Admin authentication required for image upload')
    }

    console.log('Uploading image:', file.name)

    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${fileName}`

    const client = await getAuthenticatedClient()
    
    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(filePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Failed to upload image: ${uploadError.message}`)
    }

    const { data } = client.storage
      .from(bucket)
      .getPublicUrl(filePath)

    console.log('Image uploaded successfully:', data.publicUrl)
    return data.publicUrl
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

// Delete image helper
export const deleteImage = async (url: string, bucket: string = 'product-images'): Promise<void> => {
  try {
    const fileName = url.split('/').pop()
    if (!fileName) return

    const client = await getAuthenticatedClient()
    const { error } = await client.storage
      .from(bucket)
      .remove([fileName])

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Error deleting image:', error)
    throw error
  }
}