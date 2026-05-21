import React from 'react';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Edit2,
  LayoutGrid,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { ICON_LIST } from '../../../utils/icons';
import { toLocalInputValue, formatThaiDateTime } from '../../../utils/dateUtils';
import {
  categoryTypeBadgeClass,
  categoryTypeLabel,
} from './categoryForm.utils';

const CategoryListItem = ({
  category,
  index,
  isEditing,
  isLast,
  onArchive,
  onDelete,
  onEdit,
  onMove,
  onRepublish,
}) => (
  <div
    className={`rounded-[1.6rem] border px-4 py-4 transition-all duration-300 sm:px-5 ${
      isEditing
        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary'
        : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
    }`}
  >
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
          isEditing ? 'border-primary/30 bg-primary/10 text-primary' : 'border-slate-100 bg-slate-50 text-slate-400'
        }`}>
          {React.createElement(ICON_LIST[category.icon] || LayoutGrid, { size: 20 })}
        </div>

        <div className="min-w-0 flex-1">
          <div className={`text-base font-black tracking-tight ${isEditing ? 'text-primary' : 'text-slate-900'}`}>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="truncate">{category.name}</span>
              {category.type && (
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset ${categoryTypeBadgeClass(category.type)}`}>
                  {categoryTypeLabel(category.type)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {category.isTemporary && (
              <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700">
                เธซเธกเธ”เธญเธฒเธขเธธ {formatThaiDateTime(category.expiredAt, true)}
              </span>
            )}

            {category.visibleToAll ? (
              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700">
                ทุกคน
              </span>
            ) : (
              <>
                {(category.visibleDepartments || []).map((department) => (
                  <span key={department.id} className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-primary">
                    {department.name}
                  </span>
                ))}
                {(category.visibleTiers || []).map((tier) => (
                  <span key={tier.id} className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-amber-700">
                    {tier.name}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0">
        {!category.isArchived && (
          <>
            <div className="mr-1 flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMove(index, -1)}
                className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-white hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                title="เลื่อนขึ้น"
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                disabled={isLast}
                onClick={() => onMove(index, 1)}
                className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-white hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                title="เลื่อนลง"
              >
                <ArrowDown size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onEdit({
                name: category.name,
                icon: category.icon || 'Grid',
                type: category.type || 'STRAT_BUSINESS',
                order: category.order,
                visibleToAll: category.visibleToAll ?? true,
                visibleDepartmentIds: (category.visibleDepartments || []).map((department) => department.id),
                visibleTierIds: (category.visibleTiers || []).map((tier) => tier.id),
                isTemporary: Boolean(category.isTemporary),
                expiredAt: toLocalInputValue(category.expiredAt),
              })}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-50 px-3 text-primary transition-all hover:bg-primary hover:text-white"
              title="แก้ไขหมวดหมู่"
            >
              <Edit2 size={17} />
            </button>

            <button
              type="button"
              onClick={() => onArchive(category.id)}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-amber-50 px-3 text-amber-500 transition-all hover:bg-amber-500 hover:text-white"
              title="เก็บเข้าคลัง (Archive)"
            >
              <Archive size={17} />
            </button>
          </>
        )}

        {category.isArchived && (
          <>
            <button
              type="button"
              onClick={() => onRepublish(category.id)}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-50 px-3 text-emerald-600 transition-all hover:bg-emerald-500 hover:text-white"
              title="กู้คืนหมวดหมู่"
            >
              <RotateCcw size={17} />
            </button>

            <button
              type="button"
              onClick={() => onDelete(category.id)}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-rose-50 px-3 text-rose-500 transition-all hover:bg-rose-500 hover:text-white"
              title="ลบถาวร"
            >
              <Trash2 size={17} />
            </button>
          </>
        )}
      </div>
    </div>
  </div>
);

export default CategoryListItem;
