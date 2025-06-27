import React, { useState, useRef } from 'react';
import Banner from '../components/adverts/Banner';
import ProductGrid from '../components/products/ProductGrid';
import CategorySelector from '../components/products/CategorySelector';
import { Search, ShoppingBag, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { PROMOTIONS, ADVERTS } from '../mocks/data';
import { useProducts, useCategories } from '../hooks/useDatabase';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { addItem } = useCart();
  const navigate = useNavigate();
  const sliderRef = useRef<HTMLDivElement>(null);

  // Fetch data from database (products and categories only)
  const { products, loading: productsLoading } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
    const matchesSearch = searchQuery.trim() === '' || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleOrder = (product: any) => {
    addItem(product, 1);
    navigate('/cart');
  };

  const bannerAdverts = ADVERTS.filter(advert => advert.position === 'banner' && advert.active);

  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = 400;
      const currentScroll = sliderRef.current.scrollLeft;
      const newScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      sliderRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };

  if (productsLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Left Column - Banner and Special Offers */}
      <div className="w-full md:w-1/3">
        {/* Banner */}
        <div className="mb-8">
          <Banner adverts={bannerAdverts} />
        </div>

        {/* Special Offers */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Tag className="text-primary" size={24} />
              <h2 className="text-xl font-bold">Special Offers</h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => scrollSlider('left')}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Scroll left"
              >
                <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
              <button 
                onClick={() => scrollSlider('right')}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Scroll right"
              >
                <ChevronRight size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
          
          <div 
            ref={sliderRef}
            className="relative overflow-x-auto scrollbar-hide snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex gap-4 pb-4">
              {PROMOTIONS.map(promo => (
                <div 
                  key={promo.id} 
                  className="flex-none w-[280px] snap-start bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="relative h-32 mb-4 rounded-lg overflow-hidden">
                    <img 
                      src={promo.image} 
                      alt={promo.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
                        {promo.discount}% OFF
                      </span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                    {promo.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {promo.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-bold text-sm">
                      Min: UGX {(promo.minimumPurchase || 0).toLocaleString()}
                    </span>
                    <button 
                      onClick={() => {
                        // Find product by applicable ID and add to cart
                        const product = products.find(p => p.id === promo.applicableId);
                        if (product) {
                          handleOrder(product);
                        } else {
                          // If no specific product, navigate to promotions page
                          navigate('/promotions');
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors"
                    >
                      <ShoppingBag size={16} />
                      Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Search, Categories, and Products */}
      <div className="w-full md:w-2/3">
        {/* Search Bar */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>

        {/* Categories */}
        <div className="mb-6">
          <CategorySelector
            categories={categories}
            selectedCategory={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>

        {/* Products Grid */}
        <ProductGrid 
          products={filteredProducts} 
          onOrder={handleOrder}
        />
      </div>
    </div>
  );
};

export default HomePage;