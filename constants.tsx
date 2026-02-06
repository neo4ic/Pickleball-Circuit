
import React from 'react';

export const COLORS = {
  primary: '#ffffff',
  secondary: '#888888',
  dark: '#000000',
  light: '#ffffff'
};

export const NagaiBackground: React.FC = () => (
  <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none bg-black">
    {/* Minimalist Grid */}
    <div className="absolute inset-0 opacity-[0.05]" 
         style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }}>
    </div>
  </div>
);
