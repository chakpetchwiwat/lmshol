import React from 'react';
import { AlertCircle, Calendar, Clock } from 'lucide-react';

const formatShortThaiDate = (value) => {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  }).format(date);
};

const RiskIdentificationWidget = ({ data, onSelectRisk, onViewAll }) => {
  const safeData = data || [];

  return (
    <div className="card card-no-lift flex h-full min-w-0 flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-slate-900">ความเสี่ยงรายบุคคล</h3>
            <p className="text-sm text-slate-500">ผู้เรียนที่เสี่ยงไม่บรรลุเป้าหมาย (Goal)</p>
          </div>
        </div>
        <span className="badge badge-error badge-sm">{safeData.length} ราย</span>
      </div>

      <div className="flex-1 overflow-auto">
        {safeData.length > 0 ? (
          <div className="flex flex-col gap-4">
            {safeData.slice(0, 5).map((risk) => (
              <button
                key={`${risk.userId}-${risk.courseId}`}
                type="button"
                onClick={() => onSelectRisk?.(risk)}
                className="group flex flex-col rounded-2xl border border-slate-100 p-4 text-left transition-all duration-200 hover:border-rose-200 hover:bg-rose-50/60"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{risk.userName}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {risk.department || 'General'}
                    </p>
                  </div>
                  {risk.isOverdue && (
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-600">Overdue</span>
                  )}
                </div>

                <div className="mb-2 flex items-center gap-2 text-xs text-slate-600">
                  <div className="rounded-lg bg-white p-1 shadow-sm group-hover:bg-rose-100">
                    <Calendar size={12} className={risk.isOverdue ? 'text-rose-500' : 'text-slate-400'} />
                  </div>
                  <span className="truncate font-medium">{risk.courseTitle}</span>
                  {risk.gapCount > 0 && (
                    <span className="ml-auto shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                      ขาดอีก {risk.gapCount} คอร์ส
                    </span>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <Calendar size={10} />
                    <span>Due: {formatShortThaiDate(risk.deadline)}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">ดูรายละเอียด</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
              <AlertCircle size={24} className="text-slate-200" />
            </div>
            <p className="text-sm font-bold text-slate-400">ไม่พบความเสี่ยงในขณะนี้</p>
            <p className="text-xs text-slate-300">พนักงานทุกคนยังอยู่ในช่วงเวลาที่กำหนด</p>
          </div>
        )}
      </div>

      {safeData.length > 5 && (
        <div className="mt-6 border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={() => onViewAll?.(safeData)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-100 hover:text-primary active:scale-[0.98]"
          >
            <span>ดูรายชื่อพนักงานกลุ่มเสี่ยงทั้งหมด ({safeData.length})</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default RiskIdentificationWidget;
