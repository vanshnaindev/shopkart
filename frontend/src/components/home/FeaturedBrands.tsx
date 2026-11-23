import React from 'react';
import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';

const BRANDS = [
  { name: 'Apple', logo: ' Apple', tagline: 'iPhone, iPad & Mac' },
  { name: 'Samsung', logo: 'SAMSUNG', tagline: 'Galaxy AI Flagships' },
  { name: 'Sony', logo: 'SONY', tagline: 'Noise Cancelling Audio' },
  { name: 'Nike', logo: 'NIKE', tagline: 'Air Jordans & Sport' },
  { name: 'Levis', logo: "LEVI'S", tagline: 'Iconic Stretch Denim' },
  { name: 'Herman Miller', logo: 'HermanMiller', tagline: 'Ergonomic Seating' },
  { name: 'Dyson', logo: 'dyson', tagline: 'Advanced Engineering' },
  { name: 'Bose', logo: 'BOSE', tagline: 'Spatial Audio' },
];

export const FeaturedBrands: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-xs border border-gray-100 p-6 mb-8">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-6 bg-blue-600 rounded-xs"></span>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Featured Official Brands
            <Award className="w-5 h-5 text-amber-500" />
          </h3>
        </div>
        <span className="text-xs text-gray-500 font-medium hidden sm:inline">
          100% Brand Authorized Warranty
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {BRANDS.map((b) => (
          <Link
            key={b.name}
            to={`/products?brand=${encodeURIComponent(b.name)}`}
            className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 hover:border-blue-400 hover:shadow-md transition text-center group bg-gray-50/50 hover:bg-white"
          >
            <span className="font-black text-sm text-gray-800 group-hover:text-blue-600 tracking-tight">
              {b.logo}
            </span>
            <span className="text-[10px] text-gray-500 group-hover:text-gray-700 mt-1 line-clamp-1">
              {b.tagline}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};
