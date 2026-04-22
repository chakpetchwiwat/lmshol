import React, { useEffect, useRef, useState } from 'react';

const SCROLL_EPSILON = 4;

const CategoryPills = ({
  categories = [],
  activeCat,
  onSelect,
  className = '',
}) => {
  const scrollRef = useRef(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return undefined;

    const updateFadeState = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);

      setShowLeftFade(scrollLeft > SCROLL_EPSILON);
      setShowRightFade(maxScrollLeft - scrollLeft > SCROLL_EPSILON);
    };

    updateFadeState();

    container.addEventListener('scroll', updateFadeState, { passive: true });
    window.addEventListener('resize', updateFadeState);

    return () => {
      container.removeEventListener('scroll', updateFadeState);
      window.removeEventListener('resize', updateFadeState);
    };
  }, [categories]);

  return (
    <div className={`relative ${className}`}>
      <div
        className={`pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-10 bg-gradient-to-r from-[#f8fafc] via-[#f8fafc]/90 to-transparent transition-opacity duration-200 md:w-8 ${
          showLeftFade ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-10 bg-gradient-to-l from-[#f8fafc] via-[#f8fafc]/90 to-transparent transition-opacity duration-200 md:w-8 ${
          showRightFade ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        ref={scrollRef}
        className="flex items-center gap-3 overflow-x-auto overflow-y-hidden px-5 py-2 no-scrollbar md:gap-6 md:px-0 md:pb-1 md:pt-0 md:border-b md:border-gray-200/60"
      >
        {categories.map((category) => {
          const isActive = activeCat === category.name;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.name)}
              className={`relative shrink-0 whitespace-nowrap rounded-2xl border px-4 py-3 text-sm font-bold transition-all duration-200 md:rounded-none md:border-transparent md:px-0 md:py-0 md:pb-3 md:text-[15px] ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm md:bg-transparent md:text-slate-900 md:shadow-none'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800 md:bg-transparent md:text-slate-400 md:hover:border-transparent md:hover:text-slate-700'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {category.name}
                {category.isTemporary ? (
                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-amber-700 md:text-[8px]">
                    Time
                  </span>
                ) : null}
              </span>

              {isActive ? (
                <span className="absolute bottom-[-1px] left-0 hidden h-[3px] w-full rounded-t-full bg-slate-900 md:block" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryPills;
