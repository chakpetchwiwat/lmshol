import React from 'react';
import { Target } from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  Tooltip, Legend
} from 'recharts';

const SkillGapRadarChart = ({ data }) => {
  // Map backend types to display names
  const categoryMap = {
    'STRAT_BUSINESS': 'Business Acumen / Corporate Knowledge',
    'STRAT_CORE': 'Core / Soft Skills',
    'STRAT_FUNCTIONAL': 'Functional Skills',
    'STRAT_LEADERSHIP': 'Leadership Skills',
    'STRAT_COMPLIANCE': 'Compliance',
    'STRAT_DIGITAL': 'Digital / Future Skills'
  };

  const allTypes = [
    'STRAT_BUSINESS',
    'STRAT_CORE',
    'STRAT_FUNCTIONAL',
    'STRAT_LEADERSHIP',
    'STRAT_COMPLIANCE',
    'STRAT_DIGITAL'
  ];

  const chartData = allTypes.map(type => {
    const item = (data || []).find(d => d.type === type);
    const rawMastery = item ? (item.average_mastery || 0) : 0;
    return {
      subject: categoryMap[type] || type,
      A: Number(rawMastery.toFixed(1)),
      fullMark: 100,
    };
  });

  return (
    <div className="card flex min-w-0 flex-col p-6 card-no-lift">
      <div className="flex items-center gap-2 mb-6">
        <Target size={20} className="text-primary" />
        <h3 className="text-lg font-bold">Skill Gap Analysis (Org Mastery)</h3>
      </div>
      
      <div className="h-[300px] w-full min-w-0 flex items-center justify-center">
        {(!data || data.length === 0) ? (
          <div className="text-slate-400 text-sm italic">No mastery data reported yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={false}
                axisLine={false}
              />
              <Radar
                name="Mastery Level"
                dataKey="A"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.6}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-xs text-muted font-medium italic">
          Target baseline is constant 100% for all competency areas.
        </p>
      </div>
    </div>
  );
};

export default SkillGapRadarChart;
