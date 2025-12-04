import React from 'react';
import { PRACTICE_AREAS } from '../constants';

const PracticeAreas = () => {
  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-brand-navy mb-4">Practice Areas</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Our Voice AI is trained on thousands of case files across diverse legal specialties to ensure accurate initial intake and routing.
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {PRACTICE_AREAS.map((area) => (
            <div key={area.title} className="p-6 border border-slate-100 rounded-lg bg-slate-50 hover:shadow-md transition-shadow text-center group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{area.icon}</div>
              <h3 className="font-serif font-bold text-brand-navy text-lg">{area.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PracticeAreas;
