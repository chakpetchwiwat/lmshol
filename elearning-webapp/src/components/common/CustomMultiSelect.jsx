import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, X } from 'lucide-react';

const CustomMultiSelect = ({ 
  options = [], 
  value = [], 
  onChange, 
  placeholder = 'เลือกรายการ...', 
  label,
  className = '',
  fullWidth = true,
  disabled = false,
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 });

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideContainer = containerRef.current && containerRef.current.contains(event.target);
      const isInsideDropdown = event.target.closest('.custom-multiselect-dropdown');
      
      if (!isInsideContainer && !isInsideDropdown) {
        setIsOpen(false);
      }
    };

    const handleScroll = (event) => {
      if (event.target.closest('.custom-multiselect-dropdown')) return;
      setIsOpen(false);
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', () => setIsOpen(false));
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', () => setIsOpen(false));
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (disabled) return;
    
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.querySelector('.trigger-btn').getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  const handleToggleOption = (optionValue) => {
    if (disabled) return;
    const isSelected = value.includes(optionValue);
    const newValue = isSelected
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const handleRemoveItem = (e, optionValue) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(value.filter(v => v !== optionValue));
  };

  const selectedOptions = options.filter(opt => value.includes(opt.value));

  const dropdownList = (
    <div 
      className="custom-multiselect-dropdown mt-2 max-h-64 overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.15)] animate-in fade-in zoom-in-95 duration-200"
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
        zIndex: 9999,
        overscrollBehavior: 'contain'
      }}
    >
      {options.length === 0 ? (
        <div className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
          ไม่มีข้อมูล
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {options.map((option) => {
            const isSelected = value.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleToggleOption(option.value)}
                className={`flex items-start justify-between rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                  isSelected 
                    ? 'bg-primary/10 text-primary scale-[1.01]' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
                }`}
              >
                <span className="text-left whitespace-normal leading-relaxed">{option.label}</span>
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border ${
                  isSelected
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-300 bg-white text-transparent'
                }`}>
                  <Check size={11} strokeWidth={3} />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className={`space-y-1.5 ${fullWidth ? 'w-full' : ''} ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <div
          onClick={toggleOpen}
          className={`trigger-btn group flex min-h-[46px] items-center justify-between rounded-2xl border bg-white text-sm font-bold transition-all ${
            size === 'sm' ? 'px-4 py-2' : 'px-4 py-2.5'
          } ${
            isOpen 
              ? 'border-primary ring-4 ring-primary/5 shadow-sm' 
              : 'border-slate-200 hover:border-slate-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'} ${fullWidth ? 'w-full' : ''}`}
        >
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0 mr-2">
            {selectedOptions.length === 0 ? (
              <span className="text-slate-400 truncate">{placeholder}</span>
            ) : (
              selectedOptions.map((opt) => (
                <span 
                  key={opt.value}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <span className="truncate max-w-[150px]">{opt.label}</span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveItem(e, opt.value)}
                      className="text-slate-400 hover:text-slate-600 rounded-full"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </span>
              ))
            )}
          </div>
          <ChevronDown 
            size={18} 
            className={`shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} 
          />
        </div>

        {isOpen && createPortal(dropdownList, document.body)}
      </div>
    </div>
  );
};

export default CustomMultiSelect;
