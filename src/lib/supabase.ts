import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// Database types
export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string
          username: string
          email: string
          password_hash: string
          full_name: string
          role: 'admin' | 'super_admin' | 'manager'
          avatar_url: string | null
          is_active: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          username: string
          email: string
          password_hash: string
          full_name: string
          role?: 'admin' | 'super_admin' | 'manager'
          avatar_url?: string | null
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          password_hash?: string
          full_name?: string
          role?: 'admin' | 'super_admin' | 'manager'
          avatar_url?: string | null
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          icon?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string
          price: number
          image: string
          category_id: string
          tags: string[]
          available: boolean
          featured: boolean
          rating: number | null
          unit: string
          bulk_pricing: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          description: string
          price: number
          image: string
          category_id: string
          tags?: string[]
          available?: boolean
          featured?: boolean
          rating?: number | null
          unit?: string
          bulk_pricing?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          price?: number
          image?: string
          category_id?: string
          tags?: string[]
          available?: boolean
          featured?: boolean
          rating?: number | null
          unit?: string
          bulk_pricing?: any
          created_at?: string
          updated_at?: string
        }
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          image_url: string
          alt_text: string | null
          display_order: number
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          image_url: string
          alt_text?: string | null
          display_order?: number
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          image_url?: string
          alt_text?: string | null
          display_order?: number
          is_primary?: boolean
          created_at?: string
        }
      }
      inventory: {
        Row: {
          id: string
          product_id: string
          quantity: number
          reserved_quantity: number
          reorder_level: number
          max_stock_level: number | null
          location: string | null
          last_updated: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity?: number
          reserved_quantity?: number
          reorder_level?: number
          max_stock_level?: number | null
          location?: string | null
          last_updated?: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          reserved_quantity?: number
          reorder_level?: number
          max_stock_level?: number | null
          location?: string | null
          last_updated?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          customer_name: string
          customer_email: string | null
          customer_phone: string | null
          customer_address: string | null
          total_amount: number
          status: string
          payment_status: string
          payment_method: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          customer_name: string
          customer_email?: string | null
          customer_phone?: string | null
          customer_address?: string | null
          total_amount: number
          status?: string
          payment_status?: string
          payment_method?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          customer_name?: string
          customer_email?: string | null
          customer_phone?: string | null
          customer_address?: string | null
          total_amount?: number
          status?: string
          payment_status?: string
          payment_method?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
      }
      business_analytics: {
        Row: {
          id: string
          date: string
          total_revenue: number
          total_orders: number
          total_customers: number
          top_selling_products: any
          category_performance: any
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          total_revenue?: number
          total_orders?: number
          total_customers?: number
          top_selling_products?: any
          category_performance?: any
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          total_revenue?: number
          total_orders?: number
          total_customers?: number
          top_selling_products?: any
          category_performance?: any
          created_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          key: string
          value: any
          description: string | null
          category: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: any
          description?: string | null
          category?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: any
          description?: string | null
          category?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Image upload helper
export const uploadImage = async (file: File, bucket: string = 'product-images'): Promise<string> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file)

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return data.publicUrl
}

// Delete image helper
export const deleteImage = async (url: string, bucket: string = 'product-images'): Promise<void> => {
  const fileName = url.split('/').pop()
  if (!fileName) return

  const { error } = await supabase.storage
    .from(bucket)
    .remove([fileName])

  if (error) {
    throw error
  }
}