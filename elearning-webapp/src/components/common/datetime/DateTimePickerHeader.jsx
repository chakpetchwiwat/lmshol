import React from 'react';
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react';

const DateTimePickerHeader = ({ view, onClose }) => {
  return (
    <div className="flex items-center justify-between bg-slate-50 px-8 py-6 border-b border-slate-100">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
          {view === 'calendar' || view === 'month' || view === 'year' ? <CalendarIcon size={24} /> : <Clock size={24} />}
        </div>
        <div>
          <h4 className="text-xl font-black text-slate-900 leading-tight">
            เลือก{view === 'calendar' ? 'วันที่' : view === 'time' ? 'เวลา' : view === 'month' ? 'เดือน' : 'ปี'}
          </h4>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Thai Standard 24H</p>
        </div>
      </div>
      <button 
        onClick={onClose}
        className="h-10 w-10 rounded-full border border-slate-100 bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 hover:rotate-90 transition-all duration-300"
      >
        <X size={20} />
      </button>
    </div>
  );
};

export default DateTimePickerHeader;
