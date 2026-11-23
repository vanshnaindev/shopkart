import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';

const SLIDES = [
  {
    id: 1,
    title: 'The Flagship Tech Fest',
    subtitle: 'iPhone 15 Pro, Galaxy S24 Ultra & M3 MacBooks',
    offer: 'UP TO 30% OFF + FLAT ₹1500 COUPON',
    tag: 'MEGA ELECTRONICS SALE',
    category: 'Mobiles',
    image:
      'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=1200&q=80',
    bgColor: 'from-blue-900 to-indigo-950',
  },
  {
    id: 2,
    title: 'Ultimate Audio Arena',
    subtitle: 'Sony XM5, Bose QuietComfort & JBL PartyBox',
    offer: 'EXTRA 20% INSTANT CASHBACK',
    tag: 'STUDIO-GRADE SOUND',
    category: 'Electronics',
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
    bgColor: 'from-slate-900 to-zinc-950',
  },
  {
    id: 3,
    title: 'Autumn Fashion Carnival',
    subtitle: 'Levi’s Denim, Nike Air Jordans & Designer Blazers',
    offer: 'STARTING AT JUST ₹999',
    tag: 'TRENDING STYLES',
    category: 'Fashion',
    image:
      'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=80',
    bgColor: 'from-amber-950 to-stone-900',
  },
];

export const HeroBanner: React.FC = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[current];

  return (
    <div className="relative w-full bg-slate-950 overflow-hidden shadow-md">
      <div
        className={`relative min-h-[300px] sm:min-h-[380px] lg:min-h-[420px] bg-gradient-to-r ${slide.bgColor} flex items-center transition-all duration-700`}
      >
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover object-center opacity-30 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-[1680px] mx-auto px-6 sm:px-10 lg:px-12 py-12 w-full flex flex-col items-start justify-center text-white">
          <div className="inline-flex items-center gap-1.5 bg-yellow-400 text-slate-950 text-xs font-black px-3 py-1 rounded tracking-wider uppercase mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            {slide.tag}
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-2 max-w-2xl leading-tight text-white drop-shadow-sm">
            {slide.title}
          </h2>

          <p className="text-base sm:text-lg text-gray-200 mb-4 max-w-xl font-medium">
            {slide.subtitle}
          </p>

          <div className="text-xl sm:text-2xl font-black text-yellow-300 mb-6 tracking-wide drop-shadow-xs">
            {slide.offer}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/products?category=${encodeURIComponent(slide.category)}`}
              className="inline-flex items-center gap-2 bg-[#2874F0] hover:bg-[#1259c7] text-white font-bold text-sm px-6 py-3 rounded-md shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              Shop Now
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/products?deals=true"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm px-5 py-3 rounded-md backdrop-blur-xs transition"
            >
              View Today's Deals
            </Link>
          </div>
        </div>

        {/* Controls */}
        <button
          onClick={() => setCurrent((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition backdrop-blur-xs cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => setCurrent((prev) => (prev + 1) % SLIDES.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition backdrop-blur-xs cursor-pointer"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Slide Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {SLIDES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrent(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === current ? 'w-8 bg-yellow-400' : 'w-2 bg-white/50 hover:bg-white'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
