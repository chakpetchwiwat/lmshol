import React from 'react';
import { ChevronDown } from 'lucide-react';
import { ICON_LIST } from '../../../utils/icons';

const CategoryIconPicker = ({
  categoryForm,
  editingCategoryId,
  iconPickerRef,
  showIconPicker,
  setCategoryForm,
  setShowIconPicker,
}) => (
  <div className="w-full space-y-1.5 md:w-64" ref={iconPickerRef}>
    <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">ไอคอนแสดงผล</label>
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowIconPicker(!showIconPicker)}
        className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm font-bold transition-all ${
          showIconPicker ? 'border-primary ring-2 ring-primary/10' : editingCategoryId ? 'border-primary/50' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="text-primary">
            {React.createElement(ICON_LIST[categoryForm.icon || 'LayoutGrid'] || ICON_LIST.LayoutGrid, { size: 18 })}
          </div>
          <span className="text-slate-900">{categoryForm.icon || 'LayoutGrid'}</span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${showIconPicker ? 'rotate-180' : ''}`} />
      </button>

      {showIconPicker && (
        <div className="absolute left-0 top-full z-[100] mt-3 max-h-80 w-72 overflow-y-auto rounded-3xl border border-slate-100 bg-white p-3 shadow-2xl duration-200 animate-in fade-in zoom-in-95 sm:w-80 lg:left-auto lg:right-0">
          <div className="grid grid-cols-3 gap-2">
            {Object.keys(ICON_LIST).map((iconName) => {
              const Icon = ICON_LIST[iconName];
              const isSelected = (categoryForm.icon || 'LayoutGrid') === iconName;

              return (
                <button
                  key={iconName}
                  type="button"
                  title={iconName}
                  onClick={() => {
                    setCategoryForm({ ...categoryForm, icon: iconName });
                    setShowIconPicker(false);
                  }}
                  className={`z-10 flex flex-col items-center justify-center gap-2 rounded-2xl p-3 transition-all duration-300 ${
                    isSelected
                      ? 'scale-105 bg-primary text-white shadow-lg shadow-primary/25'
                      : 'text-slate-500 hover:scale-105 hover:bg-slate-50 hover:text-primary'
                  }`}
                >
                  <div className={isSelected ? 'text-white' : 'text-slate-600'}>
                    <Icon size={20} />
                  </div>
                  <span className="w-full truncate text-center text-[10px] font-black uppercase tracking-tighter">
                    {iconName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  </div>
);

export default CategoryIconPicker;
