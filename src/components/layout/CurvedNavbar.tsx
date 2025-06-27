import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Tag, HelpCircle } from 'lucide-react';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isActive }) => (
  <NavLink
    to={to}
    className={`flex flex-col items-center justify-center`}
  >
    <div className={`p-2 transition-all duration-300 ${
      isActive 
        ? 'text-primary'
        : 'text-gray-500 dark:text-gray-400 hover:text-primary'
    }`}>
      {icon}
    </div>
    <span className={`text-xs transition-opacity duration-300 ${
      isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
    }`}>
      {label}
    </span>
  </NavLink>
);

const CurvedNavbar: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { to: '/', icon: <Home size={24} />, label: 'Home' },
    { to: '/promotions', icon: <Tag size={24} />, label: 'Promotions' },
    { to: '/cart', icon: <ShoppingBag size={24} />, label: 'Cart' },
    { to: '/help', icon: <HelpCircle size={24} />, label: 'Help' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              isActive={location.pathname === item.to}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CurvedNavbar;