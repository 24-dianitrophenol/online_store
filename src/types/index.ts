// Common types used throughout the application

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'wholesale';
  avatar?: string;
  company?: string;
  taxId?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  tags: string[];
  available: boolean;
  featured?: boolean;
  rating?: number;
  unit: string;
  bulkPricing?: {
    minQuantity: number;
    price: number;
  }[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  shippingAddress: string;
  billingAddress: string;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  orderType: 'retail' | 'wholesale';
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  discount: number;
  image?: string;
  startDate: string;
  endDate: string;
  code?: string;
  applicable: 'all' | 'category' | 'product';
  applicableId?: string;
  minimumPurchase?: number;
}

export interface Advert {
  id: string;
  title: string;
  description?: string;
  image: string;
  link?: string;
  position: 'banner' | 'sidebar' | 'inline';
  active: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  orderRef?: string;
}