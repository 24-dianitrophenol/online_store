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
  Upload,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Package2,
  Menu
} from 'lucide-react';
import { adminAuthService, productService, categoryService, orderService, analyticsService, uploadImage } from '../services/database';

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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await analyticsService.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
      
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

// Products Management Component
const ProductsManagement: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

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

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await productService.getAllForAdmin();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getAllForAdmin();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageUrl = '';
      
      // Upload image if provided
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const productData = {
        id: formData.id || `product-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category_id: formData.category_id,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        unit: formData.unit,
        available: formData.available,
        featured: formData.featured
      };

      if (editingProduct) {
        await productService.update(editingProduct.id, productData);
      } else {
        await productService.create(productData, imageUrl ? [imageUrl] : []);
      }

      await fetchProducts();
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product. Please try again.');
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
    setImageFile(null);
    setEditingProduct(null);
    setShowAddForm(false);
  };

  const handleEdit = (product: any) => {
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
    setEditingProduct(product);
    setShowAddForm(true);
  };

  const handleDelete = async (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await productService.delete(productId);
        await fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product. Please try again.');
      }
    }
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Products Management</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors w-full sm:w-auto justify-center"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                  <label className="block text-sm font-medium mb-2">Category</label>
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
                <label className="block text-sm font-medium mb-2">Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Price (UGX)</label>
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

              <div>
                <label className="block text-sm font-medium mb-2">Product Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
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

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 justify-center"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      {editingProduct ? 'Update' : 'Create'} Product
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                        src={product.product_images?.[0]?.image_url || '/images/placeholder.jpg'}
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
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
    </div>
  );
};

// Orders Management Component
const OrdersManagement: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await orderService.getAll();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await orderService.updateStatus(orderId, newStatus);
      await fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status. Please try again.');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === '' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Orders Management</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 w-full sm:w-auto"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">Order #</th>
                <th className="text-left py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">Customer</th>
                <th className="text-left py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">Amount</th>
                <th className="text-left py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">Status</th>
                <th className="text-left py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">Date</th>
                <th className="text-left py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-3 px-2 md:px-4 text-gray-900 dark:text-white font-medium text-sm">
                    {order.order_number}
                  </td>
                  <td className="py-3 px-2 md:px-4">
                    <div>
                      <p className="text-gray-900 dark:text-white text-sm">{order.customer_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{order.customer_email}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{order.customer_phone}</p>
                    </div>
                  </td>
                  <td className="py-3 px-2 md:px-4 text-gray-900 dark:text-white text-sm">
                    UGX {order.total_amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-2 md:px-4">
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs border-0 focus:ring-2 focus:ring-orange-500 ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'processing' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400 text-sm">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-2 md:px-4">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Order Details - {selectedOrder.order_number}
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Customer Information</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {selectedOrder.customer_name}</p>
                  <p><span className="font-medium">Email:</span> {selectedOrder.customer_email || 'N/A'}</p>
                  <p><span className="font-medium">Phone:</span> {selectedOrder.customer_phone || 'N/A'}</p>
                  <p><span className="font-medium">Address:</span> {selectedOrder.customer_address || 'N/A'}</p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Order Information</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Order Date:</span> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                  <p><span className="font-medium">Status:</span> {selectedOrder.status}</p>
                  <p><span className="font-medium">Payment Status:</span> {selectedOrder.payment_status}</p>
                  <p><span className="font-medium">Total Amount:</span> UGX {selectedOrder.total_amount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Notes</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{selectedOrder.notes}</p>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Order Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 text-sm">Product</th>
                      <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 text-sm">Quantity</th>
                      <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 text-sm">Unit Price</th>
                      <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 text-sm">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.order_items?.map((item: any) => (
                      <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.products?.image || '/images/placeholder.jpg'}
                              alt={item.products?.name}
                              className="w-8 h-8 md:w-10 md:h-10 object-cover rounded"
                            />
                            <span className="text-gray-900 dark:text-white text-sm">{item.products?.name}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-gray-900 dark:text-white text-sm">{item.quantity} {item.products?.unit}</td>
                        <td className="py-2 px-3 text-gray-900 dark:text-white text-sm">UGX {item.unit_price.toLocaleString()}</td>
                        <td className="py-2 px-3 text-gray-900 dark:text-white text-sm">UGX {item.total_price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
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
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;