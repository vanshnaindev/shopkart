import React from 'react';
import { Link } from 'react-router-dom';
import { ICategory } from '../../types.ts';

interface CategoryBarProps {
  categories: ICategory[];
}

export const CategoryBar: React.FC<CategoryBarProps> = ({ categories }) => {
  return (
    <div className="bg-white rounded-lg shadow-xs border border-gray-100 p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between sm:justify-around gap-3 sm:gap-6 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <Link
            key={cat._id}
            to={`/products?category=${encodeURIComponent(cat.name)}`}
            className="flex flex-col items-center gap-2 group shrink-0 min-w-[76px] sm:min-w-[90px] text-center"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-gray-50 border-2 border-transparent group-hover:border-blue-500 shadow-xs transition-all duration-200 transform group-hover:scale-105 p-1">
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover rounded-full"
                loading="lazy"
              />
            </div>
            <span className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 transition-colors leading-tight">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};
