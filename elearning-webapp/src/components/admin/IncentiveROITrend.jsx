import React from 'react';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const IncentiveROITrend = ({ data, onSelectBucket }) => {
  const safeData = data || [];

  return (
    <div className="card card-no-lift flex min-w-0 flex-col p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <TrendingUp size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-slate-900">Incentive ROI Trend</h3>
            <p className="text-sm text-slate-500">ดูความสัมพันธ์ของการเรียนจบและคะแนนสะสมในแต่ละช่วงเวลา</p>
          </div>
        </div>
      </div>

      <div className="flex h-[300px] w-full min-w-0 items-center justify-center">
        {safeData.length === 0 ? (
          <div className="text-sm italic text-slate-400">No ROI data available yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={safeData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#4f46e5', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#059669', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 45px -30px rgb(15 23 42 / 0.45)' }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar
                yAxisId="left"
                dataKey="completions"
                fill="#4f46e5"
                radius={[10, 10, 0, 0]}
                barSize={24}
                name="Learning Completions"
                onClick={onSelectBucket}
                className={onSelectBucket ? 'cursor-pointer' : ''}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="points"
                stroke="#059669"
                strokeWidth={3}
                dot={{ r: 4, fill: '#059669' }}
                activeDot={{ r: 5, onClick: onSelectBucket }}
                name="Points Distributed"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
        {safeData.slice(-6).map((bucket) => (
          <button
            key={bucket.bucketKey || bucket.label}
            type="button"
            onClick={() => onSelectBucket?.(bucket)}
            className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left transition-all hover:border-primary/20 hover:bg-primary/5"
          >
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{bucket.month}</div>
              <div className="mt-1 text-sm font-semibold text-slate-800">
                {bucket.completions} จบ / {bucket.points} points
              </div>
            </div>
            <ArrowUpRight size={16} className="text-slate-300" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default IncentiveROITrend;
