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
          size={16}
          className="text-yellow-400 fill-yellow-400 mr-1"
        />
        <span className="text-sm">{product.rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1">
      <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>
      
      {product.featured && (
        <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
          Featured
        </div>
      )}
      
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {product.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 h-10">
              {product.description}
            </p>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <div>
            <span className="font-bold text-gray-900 dark:text-white">
              UGX {product.price.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
              /{product.unit}
            </span>
          </div>
          {displayRating()}
        </div>
        
        <div className="mt-2">
          {product.tags.map((tag) => (
            <span 
              key={tag} 
              className="inline-block mr-2 mb-1 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>

        <button
          onClick={onOrder}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-primary text-white py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <ShoppingBag size={18} />
          Order Now
        </button>
      </div>
    </div>
  );
};

export default ProductCard;