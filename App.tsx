import React from 'react';
import Header from './components/Header';
import LiveDemo from './components/LiveDemo';
import PracticeAreas from './components/PracticeAreas';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-brand-navy text-white py-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://picsum.photos/1920/1080')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 text-center">
          <div className="inline-block px-3 py-1 bg-brand-gold/20 border border-brand-gold text-brand-gold text-xs font-bold rounded-full mb-6">
            NEW: MULTIMODAL LIVE API
          </div>
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 leading-tight">
            The Future of <span className="text-brand-gold">Legal Intake</span> <br /> is Voice AI.
          </h1>
          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Experience the next generation of law firm efficiency. Our AI agents handle intake and initial case evaluation with human-like empathy and legal precision.
          </p>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-16 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
           <LiveDemo />
        </div>
      </section>

      <PracticeAreas />

      {/* Footer */}
      <footer className="bg-brand-navy text-slate-400 py-12 text-center text-sm border-t border-slate-800">
        <p>&copy; {new Date().getFullYear()} Trendspot Media Agency. All rights reserved.</p>
        <p className="mt-2 text-xs">This is a technical demonstration using Google Gemini Live API. Do not use for actual legal advice.</p>
      </footer>
    </div>
  );
};

export default App;
