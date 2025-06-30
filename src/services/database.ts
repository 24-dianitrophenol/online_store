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

// Enhanced Real-time event dispatcher for immediate UI updates
class ProductEventDispatcher {
  private static instance: ProductEventDispatcher;
  
  static getInstance(): ProductEventDispatcher {
    if (!ProductEventDispatcher.instance) {
      ProductEventDispatcher.instance = new ProductEventDispatcher();
    }
    return ProductEventDispatcher.instance;
  }

  // Dispatch product created event with immediate database sync
  productCreated(product: any) {
    console.log('🚀 Product created event dispatched:', product.id);
    
    // Dispatch multiple events for comprehensive coverage
    window.dispatchEvent(new CustomEvent('productCreated', { detail: product }));
    window.dispatchEvent(new CustomEvent('refreshProducts'));
    window.dispatchEvent(new CustomEvent('forceProductRefresh'));
    
    // Force immediate refresh on both dashboard and website with staggered timing
    this.triggerImmediateRefresh();
    
    // Log success for debugging
    console.log('✅ Product creation events dispatched successfully');
  }

  // Dispatch product updated event with immediate database sync
  productUpdated(productId: string, updates: any) {
    console.log('📝 Product updated event dispatched:', productId);
    
    // Dispatch multiple events for comprehensive coverage
    window.dispatchEvent(new CustomEvent('productUpdated', { detail: { id: productId, updates } }));
    window.dispatchEvent(new CustomEvent('refreshProducts'));
    window.dispatchEvent(new CustomEvent('forceProductRefresh'));
    
    // Force immediate refresh on both dashboard and website with staggered timing
    this.triggerImmediateRefresh();
    
    // Log success for debugging
    console.log('✅ Product update events dispatched successfully');
  }

  // Dispatch product deleted event with immediate database sync
  productDeleted(productId: string) {
    console.log('🗑️ Product deleted event dispatched:', productId);
    
    // Dispatch multiple events for comprehensive coverage
    window.dispatchEvent(new CustomEvent('productDeleted', { detail: { id: productId } }));
    window.dispatchEvent(new CustomEvent('refreshProducts'));
    window.dispatchEvent(new CustomEvent('forceProductRefresh'));
    
    // Force immediate refresh on both dashboard and website with staggered timing
    this.triggerImmediateRefresh();
    
    // Log success for debugging
    console.log('✅ Product deletion events dispatched successfully');
  }

  // Force immediate refresh across all components with multiple attempts
  private triggerImmediateRefresh() {
    console.log('⚡ Triggering immediate refresh across all components...');
    
    // Immediate refresh
    window.dispatchEvent(new CustomEvent('forceProductRefresh'));
    window.dispatchEvent(new CustomEvent('refreshProducts'));
    
    // Staggered refreshes to ensure all components catch the events
    setTimeout(() => {
      console.log('⚡ Triggering 100ms delayed refresh...');
      window.dispatchEvent(new CustomEvent('forceProductRefresh'));
      window.dispatchEvent(new CustomEvent('refreshProducts'));
    }, 100);
    
    setTimeout(() => {
      console.log('⚡ Triggering 500ms delayed refresh...');
      window.dispatchEvent(new CustomEvent('forceProductRefresh'));
      window.dispatchEvent(new CustomEvent('refreshProducts'));
    }, 500);
    
    setTimeout(() => {
      console.log('⚡ Triggering 1000ms delayed refresh...');
      window.dispatchEvent(new CustomEvent('forceProductRefresh'));
      window.dispatchEvent(new CustomEvent('refreshProducts'));
    }, 1000);
  }
}

// Admin Authentication with enhanced error handling
export const adminAuthService = {
  async signIn(username: string, password: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      console.log('🔐 Attempting admin authentication...')
      
      // Try the enhanced function first, fallback to standard if not available
      let data, error;
      
      try {
        const result = await supabase
          .rpc('authenticate_admin_enhanced', { 
            p_username: username, 
            p_password: password 
          })
        data = result.data;
        error = result.error;
        console.log('✅ Enhanced authentication function used successfully');
      } catch (enhancedError) {
        console.log('⚠️ Enhanced function not available, trying standard function...')
        const result = await supabase
          .rpc('authenticate_admin', { 
            p_username: username, 
            p_password: password 
          })
        data = result.data;
        error = result.error;
        console.log('✅ Standard authentication function used successfully');
      }

      if (error) {
        console.error('❌ Authentication RPC error:', error)
        throw new Error('Invalid username or password')
      }

      if (!data) {
        throw new Error('Invalid username or password')
      }

      // Parse the JSON response if it's a string
      const admin = typeof data === 'string' ? JSON.parse(data) : data
      console.log('✅ Admin authenticated successfully:', admin.username)

      // Store admin info in localStorage with authentication flag
      localStorage.setItem('admin_user', JSON.stringify(admin))
      localStorage.setItem('admin_authenticated', 'true')
      localStorage.setItem('admin_session_id', admin.session_id || Date.now().toString())

      // Set admin context in Supabase session
      try {
        await supabase.rpc('set_admin_context')
        console.log('✅ Admin context set successfully');
      } catch (contextError) {
        console.warn('⚠️ Failed to set admin context:', contextError)
      }

      return { user: null, admin }
    } catch (error) {
      console.error('❌ Sign in error:', error)
      // Clear any existing admin context
      try {
        await supabase.rpc('clear_admin_context')
      } catch (clearError) {
        console.warn('⚠️ Failed to clear admin context:', clearError)
      }
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
      localStorage.removeItem('admin_session_id')
      
      // Sign out from Supabase auth
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.warn('⚠️ Supabase signout error:', error)
      }
      
      console.log('✅ Admin signed out successfully');
    } catch (error) {
      console.error('❌ Sign out error:', error)
      throw error
    }
  },

  async getCurrentAdmin() {
    try {
      // Check localStorage first
      const savedAdmin = localStorage.getItem('admin_user')
      const isAuthenticated = localStorage.getItem('admin_authenticated')
      const sessionId = localStorage.getItem('admin_session_id')
      
      if (savedAdmin && isAuthenticated === 'true' && sessionId) {
        const admin = JSON.parse(savedAdmin)
        
        // Verify session is still valid (optional - could add server-side verification)
        const sessionAge = Date.now() - parseInt(sessionId)
        const maxSessionAge = 24 * 60 * 60 * 1000 // 24 hours
        
        if (sessionAge < maxSessionAge) {
          // Set admin context for this session
          try {
            await supabase.rpc('set_admin_context')
            console.log('✅ Admin context restored for existing session');
          } catch (error) {
            console.warn('⚠️ Failed to set admin context:', error)
          }
          return admin
        } else {
          // Session expired, clear it
          console.log('⚠️ Admin session expired, clearing...');
          this.signOut()
        }
      }
      return null
    } catch (error) {
      console.error('❌ Get current admin error:', error)
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
      console.log('✅ Admin context set for authenticated client');
    } catch (error) {
      console.warn('⚠️ Failed to set admin context:', error)
    }
  }
  
  return supabase
}

// Enhanced Product services with comprehensive error handling, validation, and real-time sync
export const productService = {
  async getAll() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      console.log('📦 Fetching all products from database...');
      
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

      if (error) {
        console.error('❌ Error fetching products:', error)
        throw new Error(`Failed to fetch products: ${error.message}`)
      }
      
      console.log(`✅ Fetched ${data?.length || 0} products from database`)
      return data || []
    } catch (error) {
      console.error('❌ Error fetching products:', error)
      throw error
    }
  },

  async getAllForAdmin() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      console.log('🔧 Fetching all admin products from database...');
      
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

      if (error) {
        console.error('❌ Error fetching admin products:', error)
        throw new Error(`Failed to fetch products: ${error.message}`)
      }
      
      console.log(`✅ Fetched ${data?.length || 0} admin products from database`)
      return data || []
    } catch (error) {
      console.error('❌ Error fetching admin products:', error)
      throw error
    }
  },

  async getById(id: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      console.log('📦 Fetching product by ID:', id);
      
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

      if (error) {
        console.error('❌ Error fetching product:', error)
        throw new Error(`Failed to fetch product: ${error.message}`)
      }
      
      console.log('✅ Product fetched successfully:', data.id);
      return data
    } catch (error) {
      console.error('❌ Error fetching product:', error)
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
      
      console.log('🚀 Creating product with enhanced function:', product)
      
      // Validate required fields
      if (!product.name || !product.description || !product.price || !product.category_id) {
        throw new Error('Missing required fields: name, description, price, and category are required')
      }

      // Use the enhanced product creation function
      const { data, error } = await client.rpc('create_product_enhanced', {
        p_product_data: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          category_id: product.category_id,
          tags: (product.tags || []).join(', '),
          unit: product.unit || 'kg',
          available: product.available !== false,
          featured: product.featured === true,
          image: product.image || (images.length > 0 ? images[0] : '/images/placeholder.jpg')
        },
        p_images: images
      })

      if (error) {
        console.error('❌ Product creation error:', error)
        throw new Error(`Failed to create product: ${error.message}`)
      }

      console.log('✅ Product created successfully:', data)
      
      // Trigger immediate real-time sync across all components
      const dispatcher = ProductEventDispatcher.getInstance();
      dispatcher.productCreated(data);
      
      return data
    } catch (error) {
      console.error('❌ Error creating product:', error)
      throw error
    }
  },

  async update(id: string, updates: Tables['products']['Update']) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      
      console.log('📝 Updating product with enhanced function:', id, updates)
      
      // Use the enhanced product update function
      const { data, error } = await client.rpc('update_product_enhanced', {
        p_product_id: id,
        p_product_data: {
          name: updates.name,
          description: updates.description,
          price: updates.price,
          category_id: updates.category_id,
          tags: Array.isArray(updates.tags) ? updates.tags.join(', ') : updates.tags,
          unit: updates.unit,
          available: updates.available,
          featured: updates.featured,
          image: (updates as any).image
        }
      })

      if (error) {
        console.error('❌ Product update error:', error)
        throw new Error(`Failed to update product: ${error.message}`)
      }

      console.log('✅ Product updated successfully:', data)
      
      // Trigger immediate real-time sync across all components
      const dispatcher = ProductEventDispatcher.getInstance();
      dispatcher.productUpdated(id, updates);
      
      return data
    } catch (error) {
      console.error('❌ Error updating product:', error)
      throw error
    }
  },

  async delete(id: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      
      console.log('🗑️ Deleting product:', id)
      
      const { error } = await client
        .from('products')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ Product deletion error:', error)
        throw new Error(`Failed to delete product: ${error.message}`)
      }
      
      console.log('✅ Product deleted successfully:', id)
      
      // Trigger immediate real-time sync across all components
      const dispatcher = ProductEventDispatcher.getInstance();
      dispatcher.productDeleted(id);
      
      return true
    } catch (error) {
      console.error('❌ Error deleting product:', error)
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
      console.log('📂 Fetching all categories...');
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) {
        console.error('❌ Error fetching categories:', error)
        throw new Error(`Failed to fetch categories: ${error.message}`)
      }
      
      console.log(`✅ Fetched ${data?.length || 0} categories`);
      return data || []
    } catch (error) {
      console.error('❌ Error fetching categories:', error)
      throw error
    }
  },

  async getAllForAdmin() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      console.log('🔧 Fetching all admin categories...');
      
      const client = await getAuthenticatedClient()
      const { data, error } = await client
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) {
        console.error('❌ Error fetching admin categories:', error)
        throw new Error(`Failed to fetch categories: ${error.message}`)
      }
      
      console.log(`✅ Fetched ${data?.length || 0} admin categories`);
      return data || []
    } catch (error) {
      console.error('❌ Error fetching admin categories:', error)
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

      if (error) {
        console.error('❌ Error adding product image:', error)
        throw new Error(`Failed to add product image: ${error.message}`)
      }
      
      console.log('✅ Product image added successfully');
      return data
    } catch (error) {
      console.error('❌ Error adding product image:', error)
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

      if (error) {
        console.error('❌ Error fetching inventory:', error)
        throw new Error(`Failed to fetch inventory: ${error.message}`)
      }
      
      return data
    } catch (error) {
      console.error('❌ Error fetching inventory:', error)
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

      if (error) {
        console.error('❌ Error updating inventory:', error)
        throw new Error(`Failed to update inventory: ${error.message}`)
      }
      
      return data
    } catch (error) {
      console.error('❌ Error updating inventory:', error)
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

      if (error) {
        console.error('❌ Error fetching low stock items:', error)
        throw new Error(`Failed to fetch low stock items: ${error.message}`)
      }
      
      return data || []
    } catch (error) {
      console.error('❌ Error fetching low stock items:', error)
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

      if (error) {
        console.error('❌ Error fetching orders:', error)
        throw new Error(`Failed to fetch orders: ${error.message}`)
      }
      
      return data || []
    } catch (error) {
      console.error('❌ Error fetching orders:', error)
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

      if (error) {
        console.error('❌ Error fetching recent orders:', error)
        throw new Error(`Failed to fetch recent orders: ${error.message}`)
      }
      
      return data || []
    } catch (error) {
      console.error('❌ Error fetching recent orders:', error)
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

      if (error) {
        console.error('❌ Error updating order status:', error)
        throw new Error(`Failed to update order status: ${error.message}`)
      }
      
      return data
    } catch (error) {
      console.error('❌ Error updating order status:', error)
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
      console.error('❌ Error fetching dashboard stats:', error)
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

      if (error) {
        console.error('❌ Error fetching business analytics:', error)
        throw new Error(`Failed to fetch business analytics: ${error.message}`)
      }
      
      return data || []
    } catch (error) {
      console.error('❌ Error fetching business analytics:', error)
      return []
    }
  }
}

// Enhanced real-time sync utilities with immediate updates and comprehensive logging
export const syncService = {
  // Subscribe to product changes for real-time updates
  subscribeToProductChanges(callback: (payload: any) => void) {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Real-time sync not available without Supabase configuration')
      return () => {}
    }

    console.log('🔄 Setting up real-time product subscription...')

    const subscription = supabase
      .channel('products_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products' }, 
        (payload) => {
          console.log('📡 Real-time product change received:', payload)
          callback(payload)
          
          // Trigger immediate UI refresh with enhanced event dispatching
          const dispatcher = ProductEventDispatcher.getInstance();
          if (payload.eventType === 'INSERT') {
            dispatcher.productCreated(payload.new);
          } else if (payload.eventType === 'UPDATE') {
            dispatcher.productUpdated(payload.new.id, payload.new);
          } else if (payload.eventType === 'DELETE') {
            dispatcher.productDeleted(payload.old.id);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status)
      })

    return () => {
      console.log('🔄 Unsubscribing from real-time product changes')
      subscription.unsubscribe()
    }
  },

  // Trigger manual refresh across all components with enhanced coverage
  triggerProductRefresh() {
    console.log('🔄 Triggering comprehensive product refresh across all components...')
    
    // Dispatch multiple event types for maximum coverage
    window.dispatchEvent(new CustomEvent('refreshProducts'))
    window.dispatchEvent(new CustomEvent('forceProductRefresh'))
    window.dispatchEvent(new CustomEvent('productListRefresh'))
    window.dispatchEvent(new CustomEvent('adminProductRefresh'))
    
    // Trigger multiple times with staggered timing to ensure all components catch the events
    setTimeout(() => {
      console.log('🔄 Triggering 100ms delayed refresh...')
      window.dispatchEvent(new CustomEvent('refreshProducts'))
      window.dispatchEvent(new CustomEvent('forceProductRefresh'))
      window.dispatchEvent(new CustomEvent('productListRefresh'))
      window.dispatchEvent(new CustomEvent('adminProductRefresh'))
    }, 100)
    
    setTimeout(() => {
      console.log('🔄 Triggering 500ms delayed refresh...')
      window.dispatchEvent(new CustomEvent('refreshProducts'))
      window.dispatchEvent(new CustomEvent('forceProductRefresh'))
      window.dispatchEvent(new CustomEvent('productListRefresh'))
      window.dispatchEvent(new CustomEvent('adminProductRefresh'))
    }, 500)
    
    setTimeout(() => {
      console.log('🔄 Triggering 1000ms delayed refresh...')
      window.dispatchEvent(new CustomEvent('refreshProducts'))
      window.dispatchEvent(new CustomEvent('forceProductRefresh'))
      window.dispatchEvent(new CustomEvent('productListRefresh'))
      window.dispatchEvent(new CustomEvent('adminProductRefresh'))
    }, 1000)
  }
}

// Export configuration status
export const getSupabaseStatus = () => ({
  configured: isSupabaseConfigured(),
  url: import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
})