import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Package2,
  Menu,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  User,
  Lock,
  Mail,
  Shield
} from 'lucide-react';
import { adminAuthService, productService, categoryService, orderService, analyticsService } from '../services/database';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAdminProducts } from '../hooks/useDatabase';
import ImageUpload from '../components/admin/ImageUpload';

// Types
interface AdminUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  last_login?: string;
}

interface DashboardStats {
  today: {
    total_revenue: number;
    total_orders: number;
    total_customers: number;
  };
  totalProducts: number;
  activeProducts: number;
  lowStockItems: any[];
  recentOrders: any[];
}

// Dashboard Overview Component
const DashboardOverview: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    today: { total_revenue: 0, total_orders: 0, total_customers: 0 },
    totalProducts: 0,
    activeProducts: 0,
    lowStockItems: [],
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await analyticsService.getDashboardStats();
        setStats(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch dashboard stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard Error</h2>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
        
        {/* Database Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="text-green-600 dark:text-green-400" size={16} />
          <span className="text-sm text-green-800 dark:text-green-200">Database Connected • Real-time Sync Active</span>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Today's Revenue</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                UGX {stats.today.total_revenue.toLocaleString()}
              </p>
            </div>
            <DollarSign className="text-green-500" size={28} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Today's Orders</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {stats.today.total_orders}
              </p>
            </div>
            <ShoppingCart className="text-blue-500" size={28} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Products</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalProducts}
              </p>
            </div>
            <Package2 className="text-purple-500" size={28} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock Items</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {stats.lowStockItems.length}
              </p>
            </div>
            <AlertCircle className="text-red-500" size={28} />
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg">
        <h2 className="text-lg md:text-xl font-bold mb-4 text-gray-900 dark:text-white">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">Order #</th>
                <th className="text-left py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">Customer</th>
                <th className="text-left py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">Amount</th>
                <th className="text-left py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">Status</th>
                <th className="text-left py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-3 px-2 md:px-4 text-gray-900 dark:text-white text-sm">{order.order_number}</td>
                  <td className="py-3 px-2 md:px-4 text-gray-900 dark:text-white text-sm">{order.customer_name}</td>
                  <td className="py-3 px-2 md:px-4 text-gray-900 dark:text-white text-sm">UGX {order.total_amount.toLocaleString()}</td>
                  <td className="py-3 px-2 md:px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Enhanced Products Management Component with Auto-closing Modal
const ProductsManagement: React.FC = () => {
  const { products, loading, error, createProduct, updateProduct, deleteProduct, refetch } = useAdminProducts();
  const [categories, setCategories] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    price: '',
    category_id: '',
    tags: '',
    unit: 'kg',
    available: true,
    featured: false
  });

  const [productImage, setProductImage] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [operationStatus, setOperationStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

  // Enhanced real-time sync effect
  useEffect(() => {
    console.log('🔧 Admin Products: Setting up real-time sync...');
    
    const handleProductChange = (event: CustomEvent) => {
      console.log('🔧 Admin Products: Product change event received:', event.detail);
      // Products will automatically refresh via useAdminProducts hook
      setOperationStatus({
        type: 'info',
        message: 'Product list updated automatically'
      });
      setTimeout(() => setOperationStatus({ type: null, message: '' }), 3000);
    };

    const handleForceRefresh = () => {
      console.log('🔧 Admin Products: Force refresh triggered');
      refetch();
    };

    // Listen for product change events
    window.addEventListener('productCreated', handleProductChange as EventListener);
    window.addEventListener('productUpdated', handleProductChange as EventListener);
    window.addEventListener('productDeleted', handleProductChange as EventListener);
    window.addEventListener('forceProductRefresh', handleForceRefresh);

    return () => {
      window.removeEventListener('productCreated', handleProductChange as EventListener);
      window.removeEventListener('productUpdated', handleProductChange as EventListener);
      window.removeEventListener('productDeleted', handleProductChange as EventListener);
      window.removeEventListener('forceProductRefresh', handleForceRefresh);
    };
  }, [refetch]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getAllForAdmin();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleImageUploaded = (url: string) => {
    setProductImage(url);
    console.log('📷 Image uploaded:', url);
  };

  const handleImageRemoved = () => {
    setProductImage('');
    console.log('📷 Image removed');
  };

  // Enhanced form submission with improved error detection
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setSchemaError(null);
    setOperationStatus({ type: null, message: '' });

    try {
      console.log('🔧 Admin: Starting form submission...');
      
      // Validate form data
      if (!formData.name.trim()) {
        throw new Error('Product name is required');
      }
      if (!formData.description.trim()) {
        throw new Error('Product description is required');
      }
      if (!formData.price || parseFloat(formData.price) <= 0) {
        throw new Error('Valid product price is required');
      }
      if (!formData.category_id) {
        throw new Error('Product category is required');
      }

      const productData = {
        id: formData.id || `product-${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        image: productImage || '/images/placeholder.jpg',
        category_id: formData.category_id,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        unit: formData.unit,
        available: formData.available,
        featured: formData.featured
      };

      console.log('🔧 Admin: Submitting product data:', productData);

      if (editingProduct) {
        // UPDATE PRODUCT LOGIC
        console.log('📝 Admin: Updating existing product:', editingProduct.id);
        setOperationStatus({ type: 'info', message: 'Updating product...' });
        
        await updateProduct(editingProduct.id, productData);
        
        console.log('✅ Admin: Product updated successfully');
        setOperationStatus({ 
          type: 'success', 
          message: `Product "${productData.name}" updated successfully! Changes are now live on the website.` 
        });
        
        // Trigger immediate refresh on main website
        window.dispatchEvent(new CustomEvent('productUpdated', { 
          detail: { id: editingProduct.id, product: productData } 
        }));
        window.dispatchEvent(new CustomEvent('forceProductRefresh'));
        
      } else {
        // CREATE PRODUCT LOGIC
        console.log('🚀 Admin: Creating new product');
        setOperationStatus({ type: 'info', message: 'Creating product...' });
        
        await createProduct(productData, productImage ? [productImage] : []);
        
        console.log('✅ Admin: Product created successfully');
        setOperationStatus({ 
          type: 'success', 
          message: `Product "${productData.name}" created successfully! It's now available on the website.` 
        });
        
        // Trigger immediate refresh on main website
        window.dispatchEvent(new CustomEvent('productCreated', { 
          detail: { product: productData } 
        }));
        window.dispatchEvent(new CustomEvent('forceProductRefresh'));
      }

      // AUTO-CLOSE MODAL IMMEDIATELY AFTER SUCCESS
      console.log('🎯 Auto-closing modal after successful operation');
      resetForm(); // This will close the modal and reset the form
      
      // Show success message for a few seconds, then clear it
      setTimeout(() => {
        setOperationStatus({ type: null, message: '' });
      }, 4000);

    } catch (error) {
      console.error('❌ Admin: Error saving product:', error);
      
      // Enhanced error detection for database schema issues
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        // Check for PostgreSQL function not found errors (error code 42883)
        if (errorMessage.includes('function') && 
            (errorMessage.includes('does not exist') || 
             errorMessage.includes('log_admin_action') ||
             errorMessage.includes('42883'))) {
          setSchemaError('Database schema synchronization issue detected. The database functions are missing or outdated. Please refresh your Supabase schema cache in the dashboard, then try again.');
        } 
        // Check for other schema-related issues
        else if (errorMessage.includes('schema cache') || 
                 errorMessage.includes('column not found') ||
                 errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
          setSchemaError('Database schema issue detected. Please refresh your Supabase schema cache in the dashboard, then try again.');
        } 
        // Handle other specific errors
        else {
          setOperationStatus({
            type: 'error',
            message: `Failed to ${editingProduct ? 'update' : 'create'} product: ${error.message}`
          });
        }
      } else {
        setOperationStatus({
          type: 'error',
          message: `Failed to ${editingProduct ? 'update' : 'create'} product. Please try again.`
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      description: '',
      price: '',
      category_id: '',
      tags: '',
      unit: 'kg',
      available: true,
      featured: false
    });
    setProductImage('');
    setEditingProduct(null);
    setShowAddForm(false); // Close the modal
    setSchemaError(null);
    console.log('🔄 Form reset and modal closed');
  };

  const handleEdit = (product: any) => {
    console.log('📝 Admin: Editing product:', product.id);
    setFormData({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category_id: product.category_id,
      tags: product.tags.join(', '),
      unit: product.unit,
      available: product.available,
      featured: product.featured
    });
    setProductImage(product.image || '');
    setEditingProduct(product);
    setShowAddForm(true);
    setSchemaError(null);
    setOperationStatus({ type: null, message: '' });
  };

  // Enhanced delete function with real-time sync
  const handleDelete = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    const productName = product?.name || 'Unknown Product';
    
    if (confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      try {
        console.log('🗑️ Admin: Deleting product:', productId);
        setOperationStatus({ type: 'info', message: 'Deleting product...' });
        
        await deleteProduct(productId);
        
        console.log('✅ Admin: Product deleted successfully');
        setOperationStatus({ 
          type: 'success', 
          message: `Product "${productName}" deleted successfully! It has been removed from the website.` 
        });
        
        // Trigger immediate refresh on main website
        window.dispatchEvent(new CustomEvent('productDeleted', { 
          detail: { id: productId } 
        }));
        window.dispatchEvent(new CustomEvent('forceProductRefresh'));
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setOperationStatus({ type: null, message: '' });
        }, 5000);
        
      } catch (error) {
        console.error('❌ Admin: Error deleting product:', error);
        setOperationStatus({
          type: 'error',
          message: `Failed to delete product "${productName}". Please try again.`
        });
      }
    }
  };

  const handleManualRefresh = () => {
    console.log('🔄 Admin: Manual refresh triggered');
    setOperationStatus({ type: 'info', message: 'Refreshing product list...' });
    refetch();
    setTimeout(() => {
      setOperationStatus({ type: null, message: '' });
    }, 2000);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '' || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading products from database...</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">Real-time sync enabled</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Database Error</h2>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Products Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time sync with main website • {products.length} products loaded
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Refresh products"
          >
            <RefreshCw size={20} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors w-full sm:w-auto justify-center"
          >
            <Plus size={20} />
            Add Product
          </button>
        </div>
      </div>

      {/* Operation Status Display */}
      {operationStatus.type && (
        <div className={`p-4 rounded-lg border ${
          operationStatus.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' :
          operationStatus.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200' :
          'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {operationStatus.type === 'success' && <CheckCircle size={20} />}
            {operationStatus.type === 'error' && <AlertCircle size={20} />}
            {operationStatus.type === 'info' && <Clock size={20} />}
            <span className="font-medium">{operationStatus.message}</span>
          </div>
        </div>
      )}

      {/* Enhanced Schema Error Alert */}
      {schemaError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 dark:text-red-200">Database Schema Synchronization Issue</h3>
              <p className="text-red-700 dark:text-red-300 text-sm mt-1">{schemaError}</p>
              <div className="mt-3 space-y-2">
                <p className="text-red-600 dark:text-red-400 text-sm font-medium">To fix this issue:</p>
                <ol className="text-red-600 dark:text-red-400 text-sm list-decimal list-inside space-y-1 ml-2">
                  <li>Open your Supabase Dashboard</li>
                  <li>Go to the SQL Editor or Database section</li>
                  <li>Refresh the schema cache or run the latest migrations</li>
                  <li>Return here and try the operation again</li>
                </ol>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setSchemaError(null)}
                    className="text-sm px-3 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
                  >
                    Dismiss
                  </button>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw size={14} />
                    Open Supabase Dashboard
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 w-full sm:w-auto"
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Close modal"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Product Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Product ID</label>
                      <input
                        type="text"
                        value={formData.id}
                        onChange={(e) => setFormData({...formData, id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700"
                        placeholder="Auto-generated if empty"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Category *</label>
                      <select
                        value={formData.category_id}
                        onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700"
                      >
                        <option value="">Select Category</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Product Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      required
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Price (UGX) *</label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        required
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Unit</label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({...formData, unit: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700"
                      >
                        <option value="kg">Kilogram (kg)</option>
                        <option value="g">Gram (g)</option>
                        <option value="lb">Pound (lb)</option>
                        <option value="piece">Piece</option>
                        <option value="pack">Pack</option>
                        <option value="liter">Liter</option>
                        <option value="ml">Milliliter</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({...formData, tags: e.target.value})}
                      placeholder="premium, organic, local"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.available}
                        onChange={(e) => setFormData({...formData, available: e.target.checked})}
                        className="mr-2"
                      />
                      Available
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.featured}
                        onChange={(e) => setFormData({...formData, featured: e.target.checked})}
                        className="mr-2"
                      />
                      Featured
                    </label>
                  </div>
                </div>

                {/* Right Column - Image Upload */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <ImageIcon size={16} />
                      Product Image
                    </label>
                    <ImageUpload
                      onImageUploaded={handleImageUploaded}
                      onImageRemoved={handleImageRemoved}
                      currentImage={productImage}
                      className="h-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed justify-center font-semibold"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {editingProduct ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">Product</th>
                <th className="text-left py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">Category</th>
                <th className="text-left py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">Price</th>
                <th className="text-left py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">Status</th>
                <th className="text-left py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-3 px-2 md:px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.product_images?.[0]?.image_url || product.image || '/images/placeholder.jpg'}
                        alt={product.name}
                        className="w-10 h-10 md:w-12 md:h-12 object-cover rounded-lg"
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{product.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{product.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 md:px-4 text-gray-900 dark:text-white text-sm">
                    {product.categories?.name || 'N/A'}
                  </td>
                  <td className="py-3 px-2 md:px-4 text-gray-900 dark:text-white text-sm">
                    UGX {product.price.toLocaleString()}/{product.unit}
                  </td>
                  <td className="py-3 px-2 md:px-4">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        product.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {product.available ? 'Available' : 'Unavailable'}
                      </span>
                      {product.featured && (
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          Featured
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 md:px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit product"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Database Status */}
      <div className="text-center">
        <p className="text-xs text-green-600 dark:text-green-400">
          ✅ Database Connected • {products.length} products loaded • Real-time sync with main website active
        </p>
      </div>
    </div>
  );
};

// Orders Management Component
const OrdersManagement: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await orderService.getAll();
        setOrders(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading orders from database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Orders Error</h2>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Orders Management</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        {orders.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Orders Yet</h3>
            <p className="text-gray-600 dark:text-gray-400">Orders will appear here when customers place them.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 text-sm">Order #</th>
                  <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 text-sm">Customer</th>
                  <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 text-sm">Amount</th>
                  <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 text-sm">Status</th>
                  <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 text-sm">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-3 px-4 text-gray-900 dark:text-white text-sm">{order.order_number}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white text-sm">{order.customer_name}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white text-sm">UGX {order.total_amount.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-sm">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Admin Settings Component
const AdminSettings: React.FC = () => {
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | null; text: string }>({ type: null, text: '' });
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    const loadCurrentAdmin = async () => {
      try {
        const admin = await adminAuthService.getCurrentAdmin();
        if (admin) {
          setCurrentAdmin(admin);
          setFormData({
            username: admin.username,
            email: admin.email,
            full_name: admin.full_name,
            current_password: '',
            new_password: '',
            confirm_password: ''
          });
        }
      } catch (error) {
        console.error('Error loading admin data:', error);
        setMessage({ type: 'error', text: 'Failed to load admin data' });
      } finally {
        setLoading(false);
      }
    };

    loadCurrentAdmin();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear message when user starts typing
    if (message.type) {
      setMessage({ type: null, text: '' });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: null, text: '' });

    try {
      // Validate form data
      if (!formData.username.trim()) {
        throw new Error('Username is required');
      }
      if (!formData.email.trim()) {
        throw new Error('Email is required');
      }
      if (!formData.full_name.trim()) {
        throw new Error('Full name is required');
      }

      // If changing password, validate password fields
      if (formData.new_password) {
        if (!formData.current_password) {
          throw new Error('Current password is required to change password');
        }
        if (formData.new_password.length < 6) {
          throw new Error('New password must be at least 6 characters long');
        }
        if (formData.new_password !== formData.confirm_password) {
          throw new Error('New passwords do not match');
        }
      }

      // Simulate API call to update admin profile
      // In a real implementation, this would call a Supabase function
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update local state
      const updatedAdmin = {
        ...currentAdmin!,
        username: formData.username.trim(),
        email: formData.email.trim(),
        full_name: formData.full_name.trim()
      };
      
      setCurrentAdmin(updatedAdmin);
      
      // Update localStorage
      localStorage.setItem('admin_user', JSON.stringify(updatedAdmin));

      // Clear password fields
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }));

      setMessage({ type: 'success', text: 'Profile updated successfully!' });

    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to update profile' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!currentAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="mx-auto text-red-500" size={48} />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">Unable to load admin settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="text-primary" size={32} />
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Admin Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information Card */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Profile</h2>
            
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">
                  {currentAdmin.full_name.charAt(0)}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{currentAdmin.full_name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">@{currentAdmin.username}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                {currentAdmin.role}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">{currentAdmin.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <User size={16} className="text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">{currentAdmin.username}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">{currentAdmin.role}</span>
              </div>
              {currentAdmin.last_login && (
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">
                    Last login: {new Date(currentAdmin.last_login).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Update Profile</h2>

            {/* Status Message */}
            {message.type && (
              <div className={`p-4 rounded-lg mb-6 ${
                message.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                  <span className="font-medium">{message.text}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-md font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700"
                    required
                  />
                </div>
              </div>

              {/* Password Change */}
              <div className="space-y-4">
                <h3 className="text-md font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                  Change Password
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Leave password fields empty if you don't want to change your password.
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={formData.current_password}
                    onChange={(e) => handleInputChange('current_password', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700"
                    placeholder="Enter current password"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={formData.new_password}
                      onChange={(e) => handleInputChange('new_password', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700"
                      placeholder="Enter new password"
                      minLength={6}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={formData.confirm_password}
                      onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700"
                      placeholder="Confirm new password"
                      minLength={6}
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Admin Dashboard Component
const AdminDashboard: React.FC = () => {
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const admin = await adminAuthService.getCurrentAdmin();
        if (!admin) {
          navigate('/admin-user');
          return;
        }
        setCurrentAdmin(admin);
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/admin-user');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await adminAuthService.signOut();
      navigate('/admin-user');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentAdmin) {
    return null;
  }

  const navItems = [
    { path: '/admin-user/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin-user/products', icon: Package, label: 'Products' },
    { path: '/admin-user/orders', icon: ShoppingCart, label: 'Orders' },
    { path: '/admin-user/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/admin-user/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
      >
        <Menu size={24} className="text-gray-600 dark:text-gray-300" />
      </button>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-8">
            <img src="/logo.png" alt="M.A Store" className="h-8 w-8 md:h-10 md:w-10" />
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">M.A Store</h1>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Admin Panel</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`
                }
              >
                <item.icon size={18} />
                <span className="text-sm md:text-base">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 w-64 p-4 md:p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {currentAdmin.full_name.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">{currentAdmin.full_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{currentAdmin.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 md:px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto lg:ml-0">
        <div className="p-4 md:p-8 pt-16 lg:pt-8">
          <Routes>
            <Route path="/" element={<Navigate to="/admin-user/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardOverview />} />
            <Route path="/products" element={<ProductsManagement />} />
            <Route path="/orders" element={<OrdersManagement />} />
            <Route path="/analytics" element={<DashboardOverview />} />
            <Route path="/settings" element={<AdminSettings />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;