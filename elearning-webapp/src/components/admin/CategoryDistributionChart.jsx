import React from 'react';
import { ArrowUpRight, PieChart as PieIcon } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#0ea5e9'];

const CategoryDistributionChart = ({ data, totalCourses, onSelectCategory }) => {
  const safeData = data || [];

  return (
    <div className="card card-no-lift flex min-w-0 flex-col p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
          <PieIcon size={20} />
        </div>
        <div className="text-left">
          <h3 className="text-lg font-bold text-slate-900">สัดส่วนตามหมวดหมู่</h3>
          <p className="text-sm text-slate-500">คลิกที่ส่วนของวงกลมเพื่อดูผู้เรียนและคอร์สในหมวดนั้น</p>
        </div>
      </div>

      <div className="relative h-[250px] w-full min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height={250} minWidth={0} minHeight={250}>
          <PieChart>
            <Pie
              data={safeData}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={4}
              dataKey="value"
              onClick={onSelectCategory}
              className={onSelectCategory ? 'cursor-pointer' : ''}
            >
              {safeData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 45px -30px rgb(15 23 42 / 0.45)' }}
              formatter={(value, name, info) => [`${value} enrollment`, info?.payload?.name || name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">คอร์สที่เปิด</p>
          <p className="text-2xl font-black text-slate-900">{totalCourses || 0}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {safeData.slice(0, 5).map((category, index) => (
          <button
            key={category.name}
            type="button"
            onClick={() => onSelectCategory?.(category)}
            className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left transition-all hover:border-primary/20 hover:bg-primary/5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              <span className="truncate text-sm font-semibold text-slate-700">{category.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900">{category.value}</span>
              <ArrowUpRight size={15} className="text-slate-300" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryDistributionChart;
