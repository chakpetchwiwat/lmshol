import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'เลือกรายการ...', 
  label,
  className = '',
  fullWidth = true,
  disabled = false,
  size = 'md' // 'sm' or 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    if (disabled) return;
    onChange({ target: { value: option.value } });
    setIsOpen(false);
  };

  return (
    <div className={`space-y-1.5 ${fullWidth ? 'w-full' : ''} ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`group flex items-center justify-between rounded-2xl border bg-white text-sm font-bold transition-all ${
            size === 'sm' ? 'px-4 py-2.5' : 'px-4 py-3'
          } ${
            isOpen 
              ? 'border-primary ring-4 ring-primary/5 shadow-sm' 
              : 'border-slate-200 hover:border-slate-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'} ${fullWidth ? 'w-full' : ''}`}
        >
          <span className={`${selectedOption ? 'text-slate-900' : 'text-slate-400'} whitespace-nowrap`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown 
            size={18} 
            className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} 
          />
        </button>

        {isOpen && (
          <div 
            className="absolute left-0 top-full z-[999] mt-2 min-w-full w-max max-w-[18rem] max-h-64 overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.15)] animate-in fade-in zoom-in-95 duration-200"
          >
            {options.length === 0 ? (
              <div className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                ไม่มีข้อมูล
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={`flex items-start justify-between rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                        isSelected 
                          ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {option.icon && (
                          <div className={`mt-0.5 ${isSelected ? 'text-white' : 'text-primary'}`}>
                            {React.createElement(option.icon, { size: 16 })}
                          </div>
                        )}
                        <span className="text-left whitespace-normal leading-relaxed">{option.label}</span>
                      </div>
                      {isSelected && <Check size={16} className="mt-0.5 shrink-0 text-white" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomSelect;
