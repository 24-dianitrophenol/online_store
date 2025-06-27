import React from 'react';
import { Clock, Tag, ShoppingBag, ArrowRight } from 'lucide-react';
import { Promotion } from '../../types';

interface PromotionCardProps {
  promotion: Promotion;
}

const PromotionCard: React.FC<PromotionCardProps> = ({ promotion }) => {
  // Format dates
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Check if promotion is active
  const isActive = () => {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);
    return startDate <= now && now <= endDate;
  };
  
  // Calculate days remaining if active
  const getDaysRemaining = () => {
    const now = new Date();
    const endDate = new Date(promotion.endDate);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {promotion.image && (
        <div className="relative h-48 overflow-hidden">
          <img 
            src={promotion.image} 
            alt={promotion.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-4 right-4">
            {isActive() ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/90 backdrop-blur-sm text-white rounded-full text-sm font-medium">
                <Clock size={14} />
                {getDaysRemaining()} days left
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-500/90 backdrop-blur-sm text-white rounded-full text-sm font-medium">
                <Clock size={14} />
                {new Date(promotion.startDate) > new Date() ? 'Coming soon' : 'Expired'}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
            {promotion.title}
          </h3>
          <span className="px-4 py-1.5 bg-primary/10 text-primary dark:bg-primary/20 text-sm font-semibold rounded-full">
            {promotion.discount}% OFF
          </span>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6 line-clamp-2">
          {promotion.description}
        </p>
        
        {promotion.code && (
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Tag size={16} className="text-primary" />
              <p className="text-sm text-gray-600 dark:text-gray-300">Use Code:</p>
            </div>
            <code className="text-lg font-mono font-bold text-primary block">
              {promotion.code}
            </code>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Min. purchase: UGX {promotion.minimumPurchase?.toLocaleString()}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors group-hover:gap-3">
            <ShoppingBag size={18} />
            Shop Now
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromotionCard;