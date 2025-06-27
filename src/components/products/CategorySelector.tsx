import React from 'react';

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface CategorySelectorProps {
  categories: Category[];
  selectedCategory: string | null;
  onChange: (categoryId: string | null) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onChange,
}) => {
  return (
    <div className="overflow-x-auto py-4">
      <div className="flex space-x-4 min-w-max">
        <button
          onClick={() => onChange(null)}
          className={`flex-shrink-0 px-6 py-2 rounded-full transition-all duration-200 ${
            selectedCategory === null
              ? 'bg-primary text-white shadow'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          All
        </button>
        
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onChange(category.id)}
            className={`flex-shrink-0 px-6 py-2 rounded-full transition-all duration-200 ${
              selectedCategory === category.id
                ? 'bg-primary text-white shadow'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {category.icon && (
              <span className="mr-2">{category.icon}</span>
            )}
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategorySelector;