import React from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Grid,
  Search,
  ArrowRight,
} from 'lucide-react';
import { ICON_LIST } from '../../utils/icons';
import useAccessibleOverlay from '../../hooks/useAccessibleOverlay';

const CategorySearchModal = ({ isOpen, onClose, categories, courses, onSelect }) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const dialogRef = React.useRef(null);
  const titleId = React.useId();
  const searchInputId = React.useId();

  const getCategoryIcon = (iconName) => {
    return ICON_LIST[iconName] || ICON_LIST.LayoutGrid;
  };

  const filteredCategories = React.useMemo(() => {
    return categories.filter((category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  const getCourseCount = (categoryId) => {
    return courses.filter((course) => course.categoryId === categoryId).length;
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  useAccessibleOverlay({
    isOpen,
    onClose: handleClose,
    containerRef: dialogRef,
    // Removed autofocus so mobile keyboard doesn't pop up and shift the screen
  });

  // Lock body scroll tightly when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none'; // Prevent pulling down to refresh
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-0 sm:p-4 md:items-center md:p-6" style={{ pointerEvents: 'auto' }}>
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in cursor-default"
        onClick={handleClose}
        aria-label="ปิดหน้าต่างเลือกหมวดหมู่"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-[85dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[2.5rem] rounded-b-none bg-white shadow-2xl animate-slide-up md:h-[80dvh] md:rounded-[2.5rem]"
      >
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 p-6 pt-4 shrink-0 md:p-8 md:pt-8">
          <div>
            <h2 id={titleId} className="flex items-center gap-3 text-xl font-black tracking-tight text-slate-900 md:text-3xl">
              <Grid className="text-primary" size={24} />
              เลือกหมวดหมู่ที่สนใจ
            </h2>
            <p className="mt-1 text-[11px] font-medium text-slate-400 md:text-sm">
              ค้นหาจาก {categories.length} หมวดหมู่ทั้งหมดในระบบ
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="ปิดหน้าต่างเลือกหมวดหมู่"
            className="rounded-2xl border border-slate-100 bg-slate-50 p-2.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 focus:outline-none md:p-3"
          >
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 shrink-0 md:px-8">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 pointer-events-none transition-colors group-focus-within:text-primary">
              <Search size={18} />
            </div>
            <label htmlFor={searchInputId} className="sr-only">
              ค้นหาหมวดหมู่
            </label>
            <input
              id={searchInputId}
              type="text"
              placeholder="พิมพ์ชื่อหมวดหมู่ที่ต้องการค้นหา..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-12 pr-6 text-base font-medium shadow-sm transition-all placeholder-slate-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-slate-50/30 overscroll-contain">
          {filteredCategories.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
              {filteredCategories.map((category) => {
                const Icon = getCategoryIcon(category.icon);
                const count = getCourseCount(category.id);

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      onSelect(category.name);
                      handleClose();
                    }}
                    className="group relative flex h-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary">
                      <Icon size={24} />
                    </div>
                    <div className="min-w-0 w-full flex-1">
                      <h4 className="break-words text-sm md:text-base font-medium leading-tight text-slate-900 transition-colors group-hover:text-primary">
                        {category.name}
                      </h4>
                      <p className="mt-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        {count} Courses
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-300">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">
                <Search size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-400">ไม่พบหมวดหมู่ที่ค้นหา</h3>
              <p className="mt-2 max-w-xs font-medium">
                ลองเปลี่ยนคำค้นหาหรือตัวเลือกระบบจะพยายามช่วยคุณหาครับ
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CategorySearchModal;
