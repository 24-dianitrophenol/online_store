import { useState, useEffect } from 'react'
import { productService, categoryService } from '../services/database'
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

export const useProducts = () => {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const data = await productService.getAll()
      setProducts(data.map(convertProduct))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

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
        const data = await categoryService.getAll()
        setCategories(data.map(convertCategory))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch categories')
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  return { categories, loading, error }
}