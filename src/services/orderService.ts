import { supabase } from '../lib/supabase';
import { CartItem } from '../types';

export interface OrderData {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: CartItem[];
  totalAmount: number;
  notes?: string;
}

export interface DatabaseOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  total_amount: number;
  status: string;
  payment_status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  order_items?: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    products?: {
      id: string;
      name: string;
      image: string;
      unit: string;
    };
  }>;
}

export const orderService = {
  async createOrder(orderData: OrderData) {
    try {
      console.log('Creating order with data:', orderData);

      // Prepare order items for database with correct parameter order
      const orderItems = orderData.items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity
      }));

      // Call the database function with corrected parameter order
      const { data, error } = await supabase.rpc('create_complete_order', {
        p_customer_name: orderData.customerName,
        p_order_items: orderItems,
        p_total_amount: orderData.totalAmount,
        p_customer_email: orderData.customerEmail || null,
        p_customer_phone: orderData.customerPhone || null,
        p_customer_address: orderData.customerAddress || null,
        p_notes: orderData.notes || null
      });

      if (error) {
        console.error('Database error creating order:', error);
        throw new Error(`Failed to create order: ${error.message}`);
      }

      console.log('Order created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  async getAllOrders(): Promise<DatabaseOrder[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              id,
              name,
              unit
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  },

  async getOrderById(orderId: string): Promise<DatabaseOrder | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              id,
              name,
              unit
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Error fetching order:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  },

  async updateOrderStatus(orderId: string, status: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating order status:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  async getOrderAnalytics(startDate?: string, endDate?: string) {
    try {
      const { data, error } = await supabase.rpc('get_order_analytics', {
        p_start_date: startDate || null,
        p_end_date: endDate || null
      });

      if (error) {
        console.error('Error fetching order analytics:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching order analytics:', error);
      return {
        total_orders: 0,
        total_revenue: 0,
        average_order_value: 0,
        pending_orders: 0,
        completed_orders: 0,
        total_customers: 0
      };
    }
  }
};