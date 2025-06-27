import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { ShoppingBag, User, Phone, Mail, MapPin, MessageSquare, Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../services/orderService';

const CartPage: React.FC = () => {
  const { items, updateQuantity, removeItem, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setCustomerInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatModernWhatsAppMessage = (orderNumber: string) => {
    const header = `🛍️ *NEW ORDER PLACED* 🛍️\n\n`;
    
    const orderInfo = `📋 *Order Details*\n` +
                     `🔢 Order #: *${orderNumber}*\n` +
                     `📅 Date: ${new Date().toLocaleDateString('en-US', { 
                       weekday: 'long', 
                       year: 'numeric', 
                       month: 'long', 
                       day: 'numeric' 
                     })}\n` +
                     `⏰ Time: ${new Date().toLocaleTimeString('en-US', { 
                       hour: '2-digit', 
                       minute: '2-digit' 
                     })}\n\n`;

    const customerDetails = `👤 *Customer Information*\n` +
                           `📝 Name: ${customerInfo.name}\n` +
                           `📧 Email: ${customerInfo.email || 'Not provided'}\n` +
                           `📱 Phone: ${customerInfo.phone || 'Not provided'}\n` +
                           `🏠 Address: ${customerInfo.address || 'Not provided'}\n\n`;

    const itemsHeader = `🛒 *Ordered Items*\n`;
    const itemsList = items.map((item, index) => {
      const itemTotal = item.product.price * item.quantity;
      return `\n*${index + 1}. ${item.product.name}*\n` +
             `   📦 Quantity: ${item.quantity} ${item.product.unit}\n` +
             `   💰 Unit Price: UGX ${item.product.price.toLocaleString()}\n` +
             `   💵 Subtotal: UGX ${itemTotal.toLocaleString()}\n` +
             `   🏷️ Tags: ${item.product.tags.join(', ')}\n`;
    }).join('');

    const summary = `\n💰 *Order Summary*\n` +
                   `📊 Total Items: ${items.length}\n` +
                   `🧮 Total Quantity: ${items.reduce((sum, item) => sum + item.quantity, 0)} units\n` +
                   `💵 *Total Amount: UGX ${totalPrice.toLocaleString()}*\n\n`;

    const notes = customerInfo.notes ? 
                 `📝 *Special Notes*\n${customerInfo.notes}\n\n` : '';

    const footer = `✅ *Order Status: PENDING*\n` +
                  `🚚 Delivery will be arranged after confirmation\n` +
                  `💳 Payment: Cash on Delivery\n\n` +
                  `Thank you for choosing M.A Online Store! 🙏\n` +
                  `We'll contact you shortly to confirm your order.`;

    return header + orderInfo + customerDetails + itemsHeader + itemsList + summary + notes + footer;
  };

  const handleOrder = async () => {
    if (items.length === 0) return;
    
    if (!customerInfo.name.trim()) {
      alert('Please enter your name');
      return;
    }

    setIsProcessing(true);

    try {
      // Create order in database
      const orderData = {
        customerName: customerInfo.name.trim(),
        customerEmail: customerInfo.email.trim() || undefined,
        customerPhone: customerInfo.phone.trim() || undefined,
        customerAddress: customerInfo.address.trim() || undefined,
        items: items,
        totalAmount: totalPrice,
        notes: customerInfo.notes.trim() || undefined
      };

      console.log('Submitting order:', orderData);
      const result = await orderService.createOrder(orderData);
      console.log('Order created:', result);

      // Format WhatsApp message with order number
      const message = formatModernWhatsAppMessage(result.order_number);
      const encodedMessage = encodeURIComponent(message);
      
      // Open WhatsApp
      window.open(`https://wa.me/256741068782?text=${encodedMessage}`, '_blank');
      
      // Clear cart and redirect
      clearCart();
      
      // Show success message
      alert(`Order ${result.order_number} placed successfully! You'll be redirected to WhatsApp to complete your order.`);
      
      // Redirect to home page
      navigate('/');
      
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4 text-center pb-20 md:pb-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12">
          <ShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold mb-4">Your Cart is Empty</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Add some products to your cart to get started!
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 pb-20 md:pb-4">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">Complete Your Order</h1>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        {/* Cart Items */}
        <div className="space-y-4 md:space-y-6">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Order Items</h2>
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full sm:w-20 h-48 sm:h-20 object-cover rounded-lg"
                />
                <div className="flex-1 w-full">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {product.tags.map(tag => (
                      <span key={tag} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-primary font-bold mb-3">
                    UGX {product.price.toLocaleString()} / {product.unit}
                  </p>
                  
                  {/* Quantity Controls and Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">Quantity:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(product.id, quantity - 1)}
                          className="p-1 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-12 text-center font-medium">{quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(product.id, quantity + 1)}
                          className="p-1 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => removeItem(product.id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors text-sm"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-white">
                          UGX {(product.price * quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Customer Information & Order Summary */}
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg">
            <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
              <User size={24} className="text-primary" />
              Customer Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={customerInfo.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700"
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Mail size={16} />
                  Email Address
                </label>
                <input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700"
                  placeholder="your.email@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Phone size={16} />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700"
                  placeholder="+256 XXX XXX XXX"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <MapPin size={16} />
                  Delivery Address
                </label>
                <textarea
                  value={customerInfo.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700"
                  placeholder="Enter your delivery address"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <MessageSquare size={16} />
                  Special Notes
                </label>
                <textarea
                  value={customerInfo.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700"
                  placeholder="Any special instructions or requests..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg">
            <h2 className="text-lg md:text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Quantity:</span>
                <span className="font-medium">{items.reduce((sum, item) => sum + item.quantity, 0)} units</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between text-lg md:text-xl font-bold">
                  <span>Total Amount:</span>
                  <span className="text-primary">UGX {totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleOrder}
              disabled={isProcessing || !customerInfo.name.trim()}
              className="w-full mt-6 bg-primary text-white py-3 md:py-4 rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base md:text-lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Processing Order...
                </>
              ) : (
                <>
                  <ShoppingBag size={24} />
                  Place Order via WhatsApp
                </>
              )}
            </button>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
              Your order will be saved and you'll be redirected to WhatsApp to complete the process
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;