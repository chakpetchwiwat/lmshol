import React, { useId, useRef } from 'react';
import { Filter, X } from 'lucide-react';
import useAccessibleOverlay from '../../hooks/useAccessibleOverlay';

const FilterSidebar = ({
  isOpen,
  onClose,
  sortBy,
  setSortBy,
  categories,
  activeCat,
  setActiveCat,
  status,
  setStatus,
  onReset,
}) => {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const titleId = useId();

  useAccessibleOverlay({
    isOpen,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
  });

  // Lock body scroll tightly when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none'; 
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

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in sm:p-4 md:items-center md:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="ปิดตัวกรองคอร์ส"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2.5rem] rounded-b-none bg-white shadow-2xl animate-slide-up md:h-auto md:max-h-[85dvh] md:rounded-[2.5rem]"
      >
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between border-b border-gray-100 bg-white p-6 pt-4 md:p-8">
          <h3 id={titleId} className="flex items-center gap-3 text-xl font-black text-gray-900 md:text-2xl">
            <Filter size={24} className="text-primary" />
            ตัวกรองขั้นสูง
          </h3>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="ปิดตัวกรองคอร์ส"
            className="rounded-2xl border border-gray-100 bg-gray-50 p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none md:p-3"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-white">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                การจัดเรียง (Sort By)
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: 'เพิ่มล่าสุด (Newest)', value: 'newest' },
                  { label: 'เก่าที่สุด (Oldest)', value: 'oldest' },
                  { label: 'เรียงตามพยัญชนะ (A-Z)', value: 'a-z' },
                  { label: 'คะแนนสูงสุด (Max Points)', value: 'points_desc' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all ${
                      sortBy === option.value 
                        ? 'border-primary/20 bg-primary/5 ring-1 ring-primary/20' 
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`font-bold ${sortBy === option.value ? 'text-primary' : 'text-slate-700'}`}>
                      {option.label}
                    </span>
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                      sortBy === option.value 
                        ? 'border-primary bg-primary' 
                        : 'border-slate-300 bg-white'
                    }`}>
                      {sortBy === option.value && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <input
                      type="radio"
                      name="sort"
                      className="sr-only"
                      checked={sortBy === option.value}
                      onChange={() => setSortBy(option.value)}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                สถานะ (Status)
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: 'ทั้งหมด (All)', value: 'all' },
                  { label: 'กําลังเรียน (Enrolled)', value: 'enrolled' },
                  { label: 'เรียนจบแล้ว (Completed)', value: 'completed' },
                  { label: 'ยังไม่เริ่ม (Not Started)', value: 'not_started' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-all ${
                      status === option.value 
                        ? 'border-primary/20 bg-primary/5 ring-1 ring-primary/20' 
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`font-bold ${status === option.value ? 'text-primary' : 'text-slate-700'}`}>
                      {option.label}
                    </span>
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                      status === option.value 
                        ? 'border-primary bg-primary' 
                        : 'border-slate-300 bg-white'
                    }`}>
                      {status === option.value && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <input
                      type="radio"
                      name="status"
                      className="sr-only"
                      checked={status === option.value}
                      onChange={() => setStatus(option.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 border-t border-gray-100 bg-gray-50/50 p-6 md:p-8">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 rounded-2xl border border-slate-200 bg-white py-4 text-sm font-black text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95"
          >
            ล้างค่า
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-[1.5] rounded-2xl bg-primary py-4 text-sm font-black text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-hover hover:shadow-primary/40 active:scale-95"
          >
            ดูผลลัพธ์
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterSidebar;
