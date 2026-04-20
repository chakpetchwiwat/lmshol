import React from 'react';
import { ArrowUpRight, BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const WeeklyActivityChart = ({ data, onSelectBucket }) => {
  const safeData = data || [];

  return (
    <div className="card card-no-lift flex min-w-0 flex-col p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary">
            <BarChart2 size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-slate-900">กิจกรรมการเริ่มเรียน</h3>
            <p className="text-sm text-slate-500">คลิกแต่ละแท่งเพื่อดูรายชื่อผู้ที่เริ่มเรียนในช่วงนั้น</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
          {safeData.length} ช่วงเวลา
        </span>
      </div>

      <div className="relative h-[300px] w-full min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={300}>
          <BarChart data={safeData} margin={{ top: 8, right: 10, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: '#eef2ff' }}
              contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 45px -30px rgb(15 23 42 / 0.45)' }}
              formatter={(value, name, info) => [
                `${value} คน`,
                info?.payload?.label || name,
              ]}
            />
            <Bar dataKey="count" radius={[12, 12, 4, 4]} barSize={28} onClick={onSelectBucket} className={onSelectBucket ? 'cursor-pointer' : ''}>
              {safeData.map((entry, index) => (
                <Cell key={entry.bucketKey || index} fill={entry.count > 0 ? '#4f46e5' : '#cbd5e1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {safeData.slice(-6).map((bucket) => (
          <button
            key={bucket.bucketKey || bucket.label}
            type="button"
            onClick={() => onSelectBucket?.(bucket)}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition-all hover:border-primary/20 hover:bg-primary/5"
          >
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{bucket.date}</div>
              <div className="mt-1 text-sm font-semibold text-slate-800">{bucket.count} คนเริ่มเรียน</div>
            </div>
            <ArrowUpRight size={16} className="text-slate-300" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default WeeklyActivityChart;
