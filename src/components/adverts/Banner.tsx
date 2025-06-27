import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Advert } from '../../types';

interface BannerProps {
  adverts: Advert[];
  autoplay?: boolean;
  interval?: number;
}

const Banner: React.FC<BannerProps> = ({ 
  adverts, 
  autoplay = true, 
  interval = 5000 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoplay || adverts.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === adverts.length - 1 ? 0 : prevIndex + 1
      );
    }, interval);
    
    return () => clearInterval(timer);
  }, [autoplay, interval, adverts.length]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? adverts.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === adverts.length - 1 ? 0 : prevIndex + 1
    );
  };

  if (adverts.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-lg shadow-lg aspect-[21/12] bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">No banners available</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg shadow-lg aspect-[21/12]">
      <div 
        className="flex transition-transform duration-500 ease-out h-full" 
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {adverts.map((advert) => (
          <div 
            key={advert.id}
            className="w-full flex-shrink-0 relative"
          >
            <img 
              src={advert.image} 
              alt={advert.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-6">
              <h3 className="text-white text-2xl md:text-3xl font-bold mb-2">
                {advert.title}
              </h3>
              {advert.description && (
                <p className="text-white/90 text-sm md:text-base max-w-xl">
                  {advert.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {adverts.length > 1 && (
        <>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {adverts.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'bg-primary w-6' 
                    : 'bg-white/60 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Banner;