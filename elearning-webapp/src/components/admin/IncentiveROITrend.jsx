import React from 'react';
import { TrendingUp } from 'lucide-react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const IncentiveROITrend = ({ data }) => {
  return (
    <div className="card flex min-w-0 flex-col p-6 card-no-lift">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp size={20} className="text-success" />
        <h3 className="text-lg font-bold">Incentive ROI Trend</h3>
      </div>
      
      <div className="h-[300px] w-full min-w-0 flex items-center justify-center">
        {(!data || data.length === 0) ? (
          <div className="text-slate-400 text-sm italic">No ROI data available yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
            >
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                yAxisId="left" 
                tick={{ fill: '#8884d8', fontSize: 10 }} 
                axisLine={false}
                tickLine={false}
                label={{ value: 'Completions', angle: -90, position: 'insideLeft', offset: 10, fill: '#8884d8', fontSize: 10 }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fill: '#82ca9d', fontSize: 10 }} 
                axisLine={false}
                tickLine={false}
                label={{ value: 'Points', angle: 90, position: 'insideRight', offset: 10, fill: '#82ca9d', fontSize: 10 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Bar 
                yAxisId="left" 
                dataKey="completions" 
                fill="#8884d8" 
                radius={[4, 4, 0, 0]} 
                barSize={30}
                name="Learning Completions"
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="points" 
                stroke="#82ca9d" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#82ca9d' }}
                name="Points Distributed"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      
      <div className="mt-4 p-4 bg-slate-50 rounded-xl">
        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          Strategic Insight: Correlating reward distribution frequency with active learning outcomes to measure platform stickiness.
        </p>
      </div>
    </div>
  );
};

export default IncentiveROITrend;
