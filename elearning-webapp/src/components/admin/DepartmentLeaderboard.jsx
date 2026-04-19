import React from 'react';
import { Award } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const DepartmentLeaderboard = ({ data }) => {
  const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

  const sortedData = [...(data || [])]
    .sort((a, b) => b.completion_rate - a.completion_rate)
    .slice(0, 5);

  return (
    <div className="card flex min-w-0 flex-col p-6 card-no-lift">
      <div className="flex items-center gap-2 mb-6">
        <Award size={20} className="text-secondary" />
        <h3 className="text-lg font-bold">Department Benchmarking</h3>
      </div>
      
      <div className="h-[300px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
              width={80}
            />
            <Tooltip 
              cursor={{ fill: '#f1f5f9' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              formatter={(value) => [`${value}%`, 'Completion Rate']}
            />
            <Bar dataKey="completion_rate" radius={[0, 4, 4, 0]} barSize={20}>
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex flex-col gap-2">
        {sortedData.map((dept, i) => (
          <div key={dept.name} className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">{i + 1}. {dept.name}</span>
            <span className="font-bold text-slate-800">{dept.completion_rate}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartmentLeaderboard;
