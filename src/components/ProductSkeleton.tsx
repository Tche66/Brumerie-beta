import React from 'react';

export function ProductSkeleton() {
  return (
    <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-50 shadow-sm animate-pulse">
      {/* Zone Image */}
      <div className="aspect-square bg-slate-200" />
      
      {/* Zone Texte */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="h-6 w-24 bg-slate-200 rounded-lg" /> {/* Prix */}
          <div className="h-4 w-12 bg-slate-100 rounded-md" /> {/* Catégorie */}
        </div>
        <div className="h-5 w-full bg-slate-200 rounded-lg mb-2" />
        <div className="h-5 w-2/3 bg-slate-200 rounded-lg" />
        
        <div className="mt-4 flex items-center gap-2">
          <div className="h-3 w-16 bg-slate-100 rounded-full" />
          <div className="h-3 w-12 bg-slate-100 rounded-full" />
        </div>
      </div>
    </div>
  );
}
