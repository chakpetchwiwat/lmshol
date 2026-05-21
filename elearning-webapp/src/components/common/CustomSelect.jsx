import React from 'react';
import { createPortal } from 'react-dom';
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
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find(opt => opt.value === value);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideContainer = containerRef.current && containerRef.current.contains(event.target);
      const isInsideDropdown = event.target.closest('.custom-select-dropdown');
      
      if (!isInsideContainer && !isInsideDropdown) {
        setIsOpen(false);
      }
    };

    
    const handleScroll = (event) => {
      // Don't close if scrolling inside the dropdown itself
      if (event.target.closest('.custom-select-dropdown')) return;
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
      const rect = containerRef.current.querySelector('button').getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (option) => {
    if (disabled) return;
    onChange({ target: { value: option.value } });
    setIsOpen(false);
  };

  const dropdownList = (
    <div 
      className="custom-select-dropdown mt-2 max-h-64 overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.15)] animate-in fade-in zoom-in-95 duration-200"
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
  );

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
          onClick={toggleOpen}
          className={`group flex items-center justify-between rounded-2xl border bg-white text-sm font-bold transition-all ${
            size === 'sm' ? 'px-4 py-2.5' : 'px-4 py-3'
          } ${
            isOpen 
              ? 'border-primary ring-4 ring-primary/5 shadow-sm' 
              : 'border-slate-200 hover:border-slate-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'} ${fullWidth ? 'w-full' : ''}`}
        >
          <span className={`block flex-1 text-left ${selectedOption ? 'text-slate-900' : 'text-slate-400'} truncate mr-2`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown 
            size={18} 
            className={`shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} 
          />
        </button>

        {isOpen && createPortal(dropdownList, document.body)}
      </div>
    </div>
  );
};

export default CustomSelect;

