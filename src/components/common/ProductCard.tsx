import React from 'react';
import { Star, ShoppingBag } from 'lucide-react';
import { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onOrder?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onOrder }) => {
  const displayRating = () => {
    if (!product.rating) return null;
    
    return (
      <div className="flex items-center mt-1">
        <Star
          size={14}
          className="text-yellow-400 fill-yellow-400 mr-1"
        />
        <span className="text-xs sm:text-sm">{product.rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1">
      {/* Square aspect ratio image container */}
      <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700 relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {product.featured && (
          <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
            Featured
          </div>
        )}
      </div>
      
      <div className="p-3 sm:p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base line-clamp-2 leading-tight">
              {product.name}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 leading-tight">
              {product.description}
            </p>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-2">
          <div className="flex-1">
            <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
              UGX {product.price.toLocaleString()}
            </span>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 ml-1">
              /{product.unit}
            </span>
          </div>
          {displayRating()}
        </div>
        
        {/* Tags - Show only on larger mobile screens and up */}
        <div className="mb-3 hidden sm:block">
          {product.tags.slice(0, 2).map((tag) => (
            <span 
              key={tag} 
              className="inline-block mr-1 mb-1 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>

        <button
          onClick={onOrder}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2 sm:py-2.5 rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base"
        >
          <ShoppingBag size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span className="font-medium">Order Now</span>
        </button>
      </div>
    </div>
  );
};

export default ProductCard;