import React, { useId, useMemo, useRef } from 'react';
import { Filter, Sparkles, Tag, X } from 'lucide-react';
import { FILTER_VALUES } from '../../utils/constants/filters';
import useAccessibleOverlay from '../../hooks/useAccessibleOverlay';
import ModalPortal from './ModalPortal';

const DEFAULT_SORT = 'newest';
const DEFAULT_STATUS = 'all';

const SORT_OPTIONS = [
  {
    label: 'เพิ่มล่าสุด',
    description: 'คอร์สใหม่จะขึ้นก่อน',
    value: 'newest',
  },
  {
    label: 'เก่าที่สุด',
    description: 'เรียงจากคอร์สเก่าไปใหม่',
    value: 'oldest',
  },
  {
    label: 'เรียงตามพยัญชนะ',
    description: 'ดูคอร์สตามชื่อ A-Z',
    value: 'a-z',
  },
  {
    label: 'คะแนนสูงสุด',
    description: 'คอร์สที่ได้แต้มมากจะขึ้นก่อน',
    value: 'points_desc',
  },
];

const STATUS_OPTIONS = [
  {
    label: 'ทั้งหมด',
    description: 'แสดงคอร์สทุกสถานะ',
    value: 'all',
  },
  {
    label: 'กำลังเรียน',
    description: 'คอร์สที่เริ่มเรียนแล้ว',
    value: 'enrolled',
  },
  {
    label: 'เรียนจบแล้ว',
    description: 'คอร์สที่เรียนครบแล้ว',
    value: 'completed',
  },
  {
    label: 'ยังไม่เริ่ม',
    description: 'คอร์สที่ยังไม่ได้เริ่มเรียน',
    value: 'not_started',
  },
];

const SectionLabel = ({ icon, title, hint }) => (
  <div className="mb-3 flex items-center gap-2">
    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
      {icon}
    </div>
    <div>
      <h4 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{title}</h4>
      <p className="mt-0.5 text-xs font-medium text-slate-500">{hint}</p>
    </div>
  </div>
);

const OptionCard = ({ checked, label, description, onChange, name }) => (
  <label
    className={`group flex cursor-pointer items-center justify-between gap-4 rounded-[1.35rem] border px-4 py-4 transition-all ${
      checked
        ? 'border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-white shadow-[0_10px_30px_-18px_rgba(79,70,229,0.65)] ring-1 ring-primary/15'
        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
    }`}
  >
    <div className="min-w-0">
      <div className={`text-sm font-black ${checked ? 'text-primary' : 'text-slate-800'}`}>{label}</div>
      <div className="mt-1 text-xs font-medium text-slate-500">{description}</div>
    </div>

    <div
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
        checked
          ? 'border-primary bg-primary shadow-[0_0_0_4px_rgba(79,70,229,0.12)]'
          : 'border-slate-300 bg-white group-hover:border-slate-400'
      }`}
    >
      {checked ? <div className="h-2 w-2 rounded-full bg-white" /> : null}
    </div>

    <input
      type="radio"
      name={name}
      className="sr-only"
      checked={checked}
      onChange={onChange}
    />
  </label>
);

const FilterSidebar = ({
  isOpen,
  onClose,
  sortBy,
  setSortBy,
  categories = [],
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

  // Scroll lock is handled by ModalPortal, removing redundant logic
  
  const categoryOptions = useMemo(() => {
    const allOption = { id: FILTER_VALUES.ALL, name: FILTER_VALUES.ALL_LABEL };
    const safeCategories = Array.isArray(categories) ? categories : [];
    const deduped = safeCategories.filter((category, index, source) => (
      source.findIndex((item) => item?.name === category?.name) === index
    ));
    const hasAllOption = deduped.some((category) => category?.name === FILTER_VALUES.ALL_LABEL);

    return hasAllOption ? deduped : [allOption, ...deduped];
  }, [categories]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (sortBy !== DEFAULT_SORT) count += 1;
    if (status !== DEFAULT_STATUS) count += 1;
    if (activeCat && activeCat !== FILTER_VALUES.ALL_LABEL) count += 1;
    return count;
  }, [activeCat, sortBy, status]);

  const activeFilterSummary = useMemo(() => {
    const pieces = [];

    if (sortBy !== DEFAULT_SORT) {
      pieces.push(SORT_OPTIONS.find((option) => option.value === sortBy)?.label || 'การเรียง');
    }

    if (status !== DEFAULT_STATUS) {
      pieces.push(STATUS_OPTIONS.find((option) => option.value === status)?.label || 'สถานะ');
    }

    if (activeCat && activeCat !== FILTER_VALUES.ALL_LABEL) {
      pieces.push(activeCat);
    }

    return pieces;
  }, [activeCat, sortBy, status]);

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/45 backdrop-blur-md animate-fade-in md:items-stretch md:justify-end">
        <button
          type="button"
          className="absolute inset-0"
          onClick={onClose}
          aria-label="ปิดตัวกรองคอร์ส"
        />

        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative flex h-[85dvh] w-full max-w-xl flex-col rounded-t-[2rem] rounded-b-none bg-white shadow-[0_30px_90px_-30px_rgba(15,23,42,0.55)] animate-slide-up md:h-[100dvh] md:w-[min(540px,calc(100vw-24px))] md:max-w-none md:animate-slide-in-right md:rounded-none md:rounded-l-[2rem] md:border-l md:border-white/70 md:shadow-[-24px_0_70px_-35px_rgba(15,23,42,0.45)]"
        >
          <div className="flex shrink-0 justify-center pb-1 pt-3 md:hidden">
            <div className="h-1.5 w-14 rounded-full bg-slate-200" />
          </div>

          <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white px-6 pb-5 pt-4 md:px-8 md:pb-6 md:pt-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                  <Sparkles size={12} />
                  <span>Course Filters</span>
                </div>
                <h3 id={titleId} className="mt-3 flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
                  <Filter size={24} className="text-primary" />
                  <span>ตัวกรองขั้นสูง</span>
                </h3>
                <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
                  ปรับรูปแบบการแสดงคอร์สตามการเรียง หมวดหมู่ และสถานะการเรียนให้ตรงกับสิ่งที่คุณกำลังหา
                </p>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="ปิดตัวกรองคอร์ส"
                className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-400 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500">
                {activeFilterCount > 0 ? `กำลังใช้ ${activeFilterCount} ตัวกรอง` : 'ยังไม่ได้เลือกตัวกรองเพิ่ม'}
              </span>

              {activeFilterSummary.map((item) => (
                <span
                  key={item}
                  className="max-w-full truncate rounded-full bg-primary/8 px-3 py-1.5 text-xs font-bold text-primary"
                  title={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto bg-white px-6 py-6 md:px-8 md:py-7">
            <div className="space-y-7">
              <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50/65 p-4 md:p-5">
                <SectionLabel
                  icon={<Filter size={15} />}
                  title="Sort By"
                  hint="เลือกวิธีจัดลำดับคอร์สที่อยากเห็นก่อน"
                />
                <div className="grid grid-cols-1 gap-2.5">
                  {SORT_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.value}
                      name="sort"
                      label={option.label}
                      description={option.description}
                      checked={sortBy === option.value}
                      onChange={() => setSortBy(option.value)}
                    />
                  ))}
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50/65 p-4 md:p-5">
                <SectionLabel
                  icon={<Tag size={15} />}
                  title="Category"
                  hint="เลือกหมวดที่ต้องการโฟกัส"
                />
                <div className="max-h-44 overflow-y-auto pr-1">
                  <div className="flex flex-wrap gap-2">
                    {categoryOptions.length > 0 ? categoryOptions.map((category) => {
                      const categoryName = category?.name || FILTER_VALUES.ALL_LABEL;
                      const isActive = activeCat === categoryName;

                      return (
                        <button
                          key={category?.id || categoryName}
                          type="button"
                          onClick={() => setActiveCat(categoryName)}
                          title={categoryName}
                          className={`max-w-full rounded-full border px-4 py-2.5 text-sm font-bold transition-all ${
                            isActive
                              ? 'border-primary/30 bg-primary text-white shadow-[0_10px_24px_-18px_rgba(79,70,229,0.7)]'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span className="block max-w-[220px] truncate">{categoryName}</span>
                        </button>
                      );
                    }) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm font-medium text-slate-400">
                        ยังไม่มีหมวดหมู่ให้เลือก
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50/65 p-4 md:p-5">
                <SectionLabel
                  icon={<Sparkles size={15} />}
                  title="Status"
                  hint="กรองตามความคืบหน้าของการเรียน"
                />
                <div className="grid grid-cols-1 gap-2.5">
                  {STATUS_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.value}
                      name="status"
                      label={option.label}
                      description={option.description}
                      checked={status === option.value}
                      onChange={() => setStatus(option.value)}
                    />
                  ))}
                </div>
              </section>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-white/95 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur md:px-8 md:pb-8 md:pt-5">
            <div className="mb-3 flex items-center justify-between gap-3 text-xs font-bold text-slate-400">
              <span>{activeFilterCount > 0 ? `พร้อมใช้งาน ${activeFilterCount} ตัวกรอง` : 'ใช้ค่ามาตรฐานอยู่'}</span>
              <span>แตะ “ดูผลลัพธ์” เพื่อกลับไปดูรายการคอร์ส</span>
            </div>

            <div className="flex gap-3 md:gap-4">
              <button
                type="button"
                onClick={onReset}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-4 text-sm font-black text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.99]"
              >
                ล้างค่า
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-[1.4] rounded-2xl bg-primary py-4 text-sm font-black text-white shadow-[0_18px_40px_-18px_rgba(79,70,229,0.7)] transition-all hover:bg-primary-hover hover:shadow-[0_22px_45px_-20px_rgba(79,70,229,0.8)] active:scale-[0.99]"
              >
                ดูผลลัพธ์
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default FilterSidebar;
