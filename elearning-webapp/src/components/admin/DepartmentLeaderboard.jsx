import React from 'react';
import { ArrowUpRight, Award } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const COLORS = ['#4f46e5', '#7c3aed', '#a855f7', '#ec4899', '#f59e0b'];

const DepartmentLeaderboard = ({ data, onSelectDepartment }) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  const sortedData = [...(data || [])]
    .sort((left, right) => right.completion_rate - left.completion_rate)
    .slice(0, 5);

  return (
    <div className="card card-no-lift flex min-w-0 flex-col p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
            <Award size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-slate-900">Department Benchmarking</h3>
            <p className="text-sm text-slate-500">คลิกแผนกเพื่อดูรายชื่อผู้เรียนและผลการเรียนรายบุคคล</p>
          </div>
        </div>
      </div>

      <div className="relative h-[300px] w-full min-w-0">
        {mounted && (
          <ResponsiveContainer width="99%" height={300}>
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 28, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#e2e8f0" />
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
              width={110}
            />
            <Tooltip
              cursor={{ fill: '#eef2ff' }}
              contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 45px -30px rgb(15 23 42 / 0.45)' }}
              formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Completion Rate']}
            />
            <Bar
              dataKey="completion_rate"
              radius={[0, 12, 12, 0]}
              barSize={22}
              onClick={onSelectDepartment}
              className={onSelectDepartment ? 'cursor-pointer' : ''}
            >
              {sortedData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {sortedData.map((department, index) => (
          <button
            key={department.name}
            type="button"
            onClick={() => onSelectDepartment?.(department)}
            className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left transition-all hover:border-primary/20 hover:bg-primary/5"
          >
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">อันดับ {index + 1}</div>
              <div className="mt-1 text-sm font-semibold text-slate-800">{department.name}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900">{Number(department.completion_rate || 0).toFixed(1)}%</span>
              <ArrowUpRight size={16} className="text-slate-300" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DepartmentLeaderboard;
