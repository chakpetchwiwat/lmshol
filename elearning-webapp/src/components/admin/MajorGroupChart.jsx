import React from 'react';
import { ArrowUpRight, PieChart as PieIcon } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

const MajorGroupChart = ({ data, onSelectGroup }) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  const safeData = data || [];

  return (
    <div className="card card-no-lift flex h-full min-w-0 flex-col p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <PieIcon size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-slate-900">การกระจายตาม competency group</h3>
            <p className="text-sm text-slate-500">คลิกแต่ละกลุ่มเพื่อดูผู้เรียนใน competency นั้น</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
          {safeData.length} กลุ่ม
        </span>
      </div>

      <div className="flex min-w-0 flex-col items-center gap-6 2xl:flex-row 2xl:items-start">
        <div className="relative h-[220px] w-full max-w-[220px] shrink-0 min-w-0">
          {mounted && (
            <ResponsiveContainer width="99%" height={220}>
              <PieChart>
                <Pie
                  data={safeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={8}
                  dataKey="value"
                  onClick={onSelectGroup}
                  className={onSelectGroup ? 'cursor-pointer outline-none' : 'outline-none'}
                >
                  {safeData.map((entry, index) => (
                    <Cell key={entry.type || entry.name} fill={COLORS[index % COLORS.length]} className="transition-opacity hover:opacity-80" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 45px -30px rgb(15 23 42 / 0.45)' }}
                  formatter={(value, name, info) => [`${value} หมวด`, info?.payload?.name || name]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Competency</p>
            <p className="text-2xl font-black leading-none text-slate-900">{safeData.length}</p>
          </div>
        </div>

        <div className="w-full min-w-0 flex-1 space-y-3">
          {safeData.map((group, index) => (
            <button
              key={group.type || group.name}
              type="button"
              onClick={() => onSelectGroup?.(group)}
              className="flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-left transition-all hover:border-primary/20 hover:bg-primary/5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{group.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {Number(group.enrollmentCount || 0).toLocaleString()} enrollments
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-black text-slate-900">{group.value}</span>
                <ArrowUpRight size={14} className="text-slate-300" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MajorGroupChart;
