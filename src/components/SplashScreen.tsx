import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <div className="relative">
        <img 
          src="/logo.png" 
          alt="M-A General Stores" 
          className="w-40 h-40 mb-12 animate-bounce-slow"
        />
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary rounded-full animate-spin-slow border-t-transparent"></div>
          </div>
        </div>
      </div>
      <div className="mt-16 text-gray-600 dark:text-gray-300 text-lg font-medium animate-fade-in">
        Loading...
      </div>
    </div>
  );
};

export default SplashScreen;
