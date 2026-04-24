import React, { useState } from 'react';
import Skeleton from '../common/Skeleton';
import { CheckCircle2, Clock3, Printer, Target, Users, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { formatThaiDateTime } from '../../utils/dateUtils';

const STATUS_CONFIG = {
  ALL: {
    label: 'ทั้งหมด',
    icon: Users,
    valueClassName: 'text-slate-800',
    buttonClassName: 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
  },
  COMPLETED: {
    label: 'สำเร็จแล้ว',
    icon: CheckCircle2,
    valueClassName: 'text-emerald-600',
    buttonClassName: 'border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100/70',
  },
  IN_PROGRESS: {
    label: 'กำลังเรียน',
    icon: Clock3,
    valueClassName: 'text-amber-600',
    buttonClassName: 'border-amber-200 bg-amber-50 hover:border-amber-300 hover:bg-amber-100/80',
  },
  NOT_STARTED: {
    label: 'ยังไม่เริ่มเรียน',
    icon: XCircle,
    valueClassName: 'text-rose-600',
    buttonClassName: 'border-rose-200 bg-rose-50 hover:border-rose-300 hover:bg-rose-100/80',
  },
};

const GoalTrackingWidget = ({
  goals = [],
  loading = false,
  selectedDepartmentName = '',
  onOpenGoalReport,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayedGoals = isExpanded ? goals : goals.slice(0, 5);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)]">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-primary">
            <Target size={14} />
            <span>Goal Tracking</span>
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Active Goal Overview</h2>
            <p className="text-sm font-medium text-slate-500">
              คลิกจำนวนของแต่ละสถานะเพื่อดูรายชื่อพนักงานใน goal นั้น และพิมพ์รายงานได้ทันที
              {selectedDepartmentName ? ` สำหรับ ${selectedDepartmentName}` : ''}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          แสดงเฉพาะ goal ที่ยัง Active อยู่ในระบบ
        </div>
      </div>

      {loading ? (
        <Skeleton.List count={3} />
      ) : goals.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <h3 className="text-lg font-black text-slate-700">ยังไม่มี Active Goal</h3>
          <p className="mt-2 text-sm text-slate-500">เมื่อมีการมอบหมาย goal แล้ว รายการติดตามจะขึ้นในส่วนนี้อัตโนมัติ</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-5">
            {displayedGoals.map((goal) => (
              <article
                key={goal.id}
                className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50/70 to-primary/5 animate-fade-in"
              >
                <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Active Goal</p>
                      <h3 className="mt-1 text-xl font-black text-slate-900">{goal.title}</h3>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                        สร้างเมื่อ: {goal.createdAt ? formatThaiDateTime(goal.createdAt, false) : '-'}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                        Target: {goal.targetLabel}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                        Scope: {goal.scopeLabel}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                        Due: {goal.expiryDate ? formatThaiDateTime(goal.expiryDate, true) : 'ไม่กำหนด'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenGoalReport(goal, 'ALL')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm font-bold text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/5"
                  >
                    <Printer size={16} />
                    <span>ดูรายชื่อและพิมพ์</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-white/80 p-5 xl:grid-cols-4">
                  {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
                    const Icon = config.icon;

                    return (
                      <button
                        key={statusKey}
                        type="button"
                        onClick={() => onOpenGoalReport(goal, statusKey)}
                        className={`rounded-[1.25rem] border p-4 text-left transition-all hover:-translate-y-0.5 ${config.buttonClassName}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{config.label}</p>
                            <p className={`mt-2 text-3xl font-black ${config.valueClassName}`}>{goal.counts[statusKey] || 0}</p>
                          </div>
                          <div className="rounded-2xl bg-white/80 p-2 text-slate-500 shadow-sm">
                            <Icon size={18} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>

          {goals.length > 5 && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-10 py-4 text-sm font-black text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-primary active:scale-[0.98]"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp size={20} />
                    <span>ย่อรายการลง</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={20} />
                    <span>ดูเป้าหมายทั้งหมด ({goals.length})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default GoalTrackingWidget;
