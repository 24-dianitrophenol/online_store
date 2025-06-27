import React, { useState } from 'react';
import { PROMOTIONS } from '../mocks/data';
import { ShoppingBag, Clock, Tag, Filter } from 'lucide-react';

const PromotionsPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filteredPromotions = activeFilter
    ? PROMOTIONS.filter(promo => promo.applicable === activeFilter)
    : PROMOTIONS;

  const getDaysRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isActive = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= now && now <= end;
  };

  return (
    <div className="pb-20 md:pb-0">
      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 dark:from-primary/10 dark:to-secondary/10 rounded-2xl p-8 mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Special Offers & Promotions
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Take advantage of our latest deals and discounts on quality products.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="text-gray-600 dark:text-gray-300" size={20} />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filter by:</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setActiveFilter(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === null
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All Promotions
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All Products
          </button>
          <button
            onClick={() => setActiveFilter('category')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'category'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Category Specific
          </button>
          <button
            onClick={() => setActiveFilter('product')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'product'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Product Specific
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPromotions.map(promo => (
          <div key={promo.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden group hover:shadow-lg transition-all duration-300">
            {promo.image && (
              <div className="h-48 overflow-hidden relative">
                <img 
                  src={promo.image} 
                  alt={promo.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-4 right-4">
                  {isActive(promo.startDate, promo.endDate) ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm font-medium">
                      <Clock size={14} />
                      {getDaysRemaining(promo.endDate)} days left
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full text-sm font-medium">
                      <Clock size={14} />
                      {new Date(promo.startDate) > new Date() ? 'Coming soon' : 'Expired'}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {promo.title}
                </h3>
                <span className="px-3 py-1 bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200 text-sm font-medium rounded-full">
                  {promo.discount}% OFF
                </span>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {promo.description}
              </p>
              
              {promo.code && (
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-gray-500 dark:text-gray-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">Use Code:</p>
                  </div>
                  <code className="text-lg font-mono font-bold text-primary block mt-1">
                    {promo.code}
                  </code>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Min. purchase: UGX {promo.minimumPurchase?.toLocaleString()}
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                  <ShoppingBag size={18} />
                  Shop Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPromotions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No promotions found for the selected filter.</p>
        </div>
      )}
    </div>
  );
};

export default PromotionsPage;