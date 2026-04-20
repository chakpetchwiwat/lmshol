import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { formatThaiDateTime } from '../../utils/dateUtils';
import ModalPortal from '../common/ModalPortal';

// Sub-components
import DateTimePickerHeader from './datetime/DateTimePickerHeader';
import DateTimeViewTabs from './datetime/DateTimeViewTabs';
import CalendarView from './datetime/CalendarView';
import TimeView from './datetime/TimeView';
import MonthYearSelector from './datetime/MonthYearSelector';
import DateTimePickerActions from './datetime/DateTimePickerActions';

const CustomDateTimePicker = ({ 
  value, 
  onChange, 
  label = 'กำหนดวันและเวลาหมดอายุ (พ.ศ.)', 
  showTime = true,
  isEndOfDay = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('calendar'); // 'calendar', 'time', 'month', 'year'
  
  // Date logic
  const initialDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(new Date(initialDate));
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  
  // Time logic
  const [hours, setHours] = useState(selectedDate ? selectedDate.getHours() : 23);
  const [minutes, setMinutes] = useState(selectedDate ? selectedDate.getMinutes() : 59);
  
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const daysOfWeek = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, currentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, currentMonth: true });
    }
    return days;
  }, [viewDate]);

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const handleMonthSelect = (monthIdx) => {
    setViewDate(new Date(viewDate.getFullYear(), monthIdx, 1));
    setView('calendar');
  };

  const handleYearSelect = (year) => {
    setViewDate(new Date(year, viewDate.getMonth(), 1));
    setView('calendar');
  };

  const handlePrevYearRange = () => {
    setViewDate(new Date(viewDate.getFullYear() - 12, viewDate.getMonth(), 1));
  };

  const handleNextYearRange = () => {
    setViewDate(new Date(viewDate.getFullYear() + 12, viewDate.getMonth(), 1));
  };

  const updateValue = (date) => {
    const finalDate = new Date(date);
    if (showTime) {
      finalDate.setHours(hours, minutes, 0, 0);
    } else {
      if (isEndOfDay) {
        finalDate.setHours(23, 59, 59, 999);
      } else {
        finalDate.setHours(0, 0, 0, 0);
      }
    }
    onChange({ target: { value: finalDate.toISOString() } });
  };

  const handleDateClick = (day) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    setSelectedDate(newDate);
    
    if (showTime) {
      setView('time');
    } else {
      updateValue(newDate);
      setIsOpen(false);
    }
  };

  const handleApply = () => {
    const dateToUse = selectedDate || new Date();
    const finalDate = new Date(dateToUse);
    finalDate.setHours(hours);
    finalDate.setMinutes(minutes);
    updateValue(finalDate);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange({ target: { value: '' } });
    setSelectedDate(null);
    setIsOpen(false);
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear();
  };

  const isSelected = (day) => {
    return selectedDate && day === selectedDate.getDate() && viewDate.getMonth() === selectedDate.getMonth() && viewDate.getFullYear() === selectedDate.getFullYear();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 ml-1">
        <Clock size={14} className="text-amber-600" />
        <label className="text-[10px] font-black uppercase tracking-widest text-amber-900/60">{label}</label>
      </div>
      
      <div onClick={() => setIsOpen(true)} className="group relative cursor-pointer">
        <div className="flex w-full items-center justify-between rounded-2xl border border-amber-200/60 bg-white/90 px-5 py-4 shadow-inner transition-all group-hover:border-amber-400 group-hover:ring-4 group-hover:ring-amber-400/5">
          <span className="text-sm font-black text-slate-800">
            {value ? formatThaiDateTime(value, showTime) : `คลิกเพื่อกำหนดวัน${showTime ? 'และเวลา' : ''}...`}
          </span>
          <CalendarIcon size={18} className="text-amber-500/50 group-hover:text-amber-500 transition-colors" />
        </div>
      </div>

      <ModalPortal isOpen={isOpen}>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="absolute inset-0 bg-slate-950/40" onClick={() => setIsOpen(false)} />
          
          <div className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white shadow-[0_32px_80px_-20px_rgba(15,23,42,0.3)] animate-in fade-in zoom-in-95 duration-200">
            <DateTimePickerHeader view={view} onClose={() => setIsOpen(false)} />
            <DateTimeViewTabs view={view} setView={setView} showTime={showTime} />

            <div className="p-8">
              {view === 'calendar' && (
                <CalendarView 
                  viewDate={viewDate}
                  calendarDays={calendarDays}
                  daysOfWeek={daysOfWeek}
                  months={months}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onViewMonthSelect={() => setView('month')}
                  onViewYearSelect={() => setView('year')}
                  onDateClick={handleDateClick}
                  isSelected={isSelected}
                  isToday={isToday}
                />
              )}

              {(view === 'month' || view === 'year') && (
                <MonthYearSelector 
                  view={view}
                  viewDate={viewDate}
                  months={months}
                  onMonthSelect={handleMonthSelect}
                  onYearSelect={handleYearSelect}
                  onPrevYearRange={handlePrevYearRange}
                  onNextYearRange={handleNextYearRange}
                />
              )}

              {view === 'time' && (
                <TimeView 
                  hours={hours}
                  setHours={setHours}
                  minutes={minutes}
                  setMinutes={setMinutes}
                />
              )}
            </div>

            <DateTimePickerActions onClear={handleClear} onApply={handleApply} />
          </div>
        </div>
      </ModalPortal>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default CustomDateTimePicker;
