import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const YEAR_GRID_SIZE = 12;
const YEAR_OFFSET = 4;

const MonthYearSelector = ({
  view,
  viewDate,
  months,
  onMonthSelect,
  onYearSelect,
  onPrevYearRange,
  onNextYearRange,
}) => {
  if (view === 'month') {
    return (
      <div className="grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {months.map((month, index) => (
          <button
            key={month}
            onClick={() => onMonthSelect(index)}
            className={`rounded-2xl py-4 text-sm font-black transition-all ${
              viewDate.getMonth() === index ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {month}
          </button>
        ))}
      </div>
    );
  }

  if (view === 'year') {
    const startYear = viewDate.getFullYear() - YEAR_OFFSET;
    const endYear = startYear + YEAR_GRID_SIZE - 1;
    const years = Array.from({ length: YEAR_GRID_SIZE }, (_, index) => startYear + index);

    return (
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={onPrevYearRange}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            <ChevronLeft size={18} />
            <span>ย้อนหลัง</span>
          </button>

          <div className="text-center">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">ช่วงปี</div>
            <div className="mt-1 text-sm font-black text-slate-900">
              {startYear + 543} - {endYear + 543}
            </div>
          </div>

          <button
            type="button"
            onClick={onNextYearRange}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            <span>ถัดไป</span>
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 px-1">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => onYearSelect(year)}
              className={`rounded-2xl py-4 text-sm font-black transition-all ${
                viewDate.getFullYear() === year ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {year + 543}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export default MonthYearSelector;
