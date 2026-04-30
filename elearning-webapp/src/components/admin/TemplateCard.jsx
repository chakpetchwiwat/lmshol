import React from 'react';
import { Check } from 'lucide-react';

const TemplateCard = ({ template, isSelected, onSelect }) => {
  return (
    <div 
      onClick={() => onSelect(template.id)}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
        isSelected 
          ? 'border-primary bg-primary/5 ring-4 ring-primary/10 shadow-lg' 
          : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
      }`}
    >
      {/* Visual Preview (CSS Based) */}
      <div className="aspect-[1.4/1] w-full overflow-hidden bg-slate-50 p-3">
        <div className={`h-full w-full rounded shadow-sm border ${template.id === 'CLASSIC_001' ? 'border-amber-200' : 'border-slate-200'} bg-white relative`}>
          {/* Mock Template Content */}
          {template.id === 'CLASSIC_001' && (
            <div className="absolute inset-1 border-[0.5px] border-amber-400 opacity-30 flex flex-col items-center justify-center">
              <div className="w-1/2 h-1 bg-slate-800 mb-1" />
              <div className="w-1/3 h-0.5 bg-slate-400 mb-4" />
              <div className="w-2/3 h-1 bg-slate-900 mb-1" />
              <div className="w-1/2 h-0.5 bg-slate-300" />
            </div>
          )}
          {template.id === 'MODERN_001' && (
            <div className="absolute inset-0 flex">
              <div className="w-4 h-full bg-slate-800" />
              <div className="w-1 h-full bg-primary" />
              <div className="flex-1 p-4 flex flex-col justify-center">
                <div className="w-1/3 h-2 bg-primary/20 mb-2" />
                <div className="w-2/3 h-2 bg-slate-900 mb-1" />
                <div className="w-1/2 h-1 bg-slate-300" />
              </div>
            </div>
          )}
          {template.id === 'MINIMAL_001' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <div className="w-3/4 h-0.5 bg-slate-200 mb-6" />
              <div className="w-1/2 h-2 bg-slate-900 mb-2 font-serif text-[4px] text-center">CERTIFICATE</div>
              <div className="w-1/3 h-1 bg-slate-400 mb-4" />
              <div className="w-2/3 h-0.5 bg-slate-100" />
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h5 className={`font-black text-sm ${isSelected ? 'text-primary' : 'text-slate-900'}`}>
            {template.name}
          </h5>
          {isSelected && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
              <Check size={12} strokeWidth={4} />
            </div>
          )}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500 line-clamp-2 font-medium">
          {template.description}
        </p>
      </div>

      {/* Hover Overlay */}
      {!isSelected && (
        <div className="absolute inset-0 bg-primary/0 transition-all group-hover:bg-primary/5" />
      )}
    </div>
  );
};

export default TemplateCard;
