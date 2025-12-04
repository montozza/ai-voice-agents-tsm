import React from 'react';

const Header = () => {
  return (
    <nav className="w-full bg-brand-navy py-4 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {/* Logo Placeholder */}
          <div className="w-8 h-8 bg-brand-gold rounded-sm flex items-center justify-center font-serif font-bold text-brand-navy">
            T
          </div>
          <div>
             <h1 className="text-white font-serif font-bold text-xl tracking-wide">TRENDSPOT</h1>
             <p className="text-slate-400 text-xs tracking-wider uppercase">Legal AI Solutions</p>
          </div>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-slate-300">
          <span className="hover:text-white cursor-pointer transition-colors">Solutions</span>
          <span className="hover:text-white cursor-pointer transition-colors">Practice Areas</span>
          <span className="text-white border-b-2 border-brand-gold pb-1 cursor-pointer">Live Demo</span>
          <span className="hover:text-white cursor-pointer transition-colors">Contact</span>
        </div>
        <button className="bg-brand-gold hover:bg-yellow-600 text-brand-navy px-4 py-2 rounded font-bold text-sm transition-colors">
          Book Consultation
        </button>
      </div>
    </nav>
  );
};

export default Header;
