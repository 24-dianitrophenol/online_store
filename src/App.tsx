import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import CurvedNavbar from './components/layout/CurvedNavbar';
import HomePage from './pages/HomePage';
import PromotionsPage from './pages/PromotionsPage';
import HelpPage from './pages/HelpPage';
import CartPage from './pages/CartPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';
import SplashScreen from './components/SplashScreen';
import './App.css';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <ThemeProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
            <Routes>
              {/* External Admin Routes - Only accessible via direct URL */}
              <Route path="/admin-user" element={<AdminLoginPage />} />
              <Route path="/admin-user/*" element={<AdminDashboard />} />
              
              {/* Public Routes with main website layout */}
              <Route path="/*" element={
                <>
                  <Header />
                  <div className="container mx-auto px-4 pt-20">
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/promotions" element={<PromotionsPage />} />
                      <Route path="/help" element={<HelpPage />} />
                      <Route path="/cart" element={<CartPage />} />
                    </Routes>
                  </div>
                  <CurvedNavbar />
                </>
              } />
            </Routes>
          </div>
        </Router>
      </CartProvider>
    </ThemeProvider>
  );
}

export default App;