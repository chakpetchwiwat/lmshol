import React from 'react';
import { ArrowUpRight, Target } from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  Tooltip,
} from 'recharts';

const CATEGORY_MAP = {
  STRAT_BUSINESS: 'Business Acumen / Corporate Knowledge',
  STRAT_CORE: 'Core / Soft Skills',
  STRAT_FUNCTIONAL: 'Functional Skills',
  STRAT_LEADERSHIP: 'Leadership Skills',
  STRAT_COMPLIANCE: 'Compliance',
  STRAT_DIGITAL: 'Digital / Future Skills',
};

const ALL_TYPES = Object.keys(CATEGORY_MAP);

const SkillGapRadarChart = ({ data, onSelectSkillGap }) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  const safeData = data || [];

  const chartData = ALL_TYPES.map((type) => {
    const item = safeData.find((entry) => entry.type === type);
    const mastery = item ? Number((item.average_mastery || 0).toFixed(1)) : 0;
    return {
      type,
      subject: CATEGORY_MAP[type] || type,
      mastery,
      fullMark: 100,
      raw: item || { type, average_mastery: 0, details: [] },
    };
  });

  return (
    <div className="card card-no-lift flex min-w-0 flex-col p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary">
            <Target size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-slate-900">Skill Gap Analysis</h3>
            <p className="text-sm text-slate-500">เลือก competency ใต้กราฟเพื่อดูรายชื่อผู้เรียนและคะแนนสอบ</p>
          </div>
        </div>
      </div>

      <div className="relative flex h-[300px] w-full min-w-0 items-center justify-center">
        {safeData.length === 0 ? (
          <div className="text-sm italic text-slate-400">No mastery data reported yet</div>
        ) : (
          mounted && (
            <ResponsiveContainer width="99%" height={300}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Mastery Level"
                  dataKey="mastery"
                  stroke="#4f46e5"
                  fill="#4f46e5"
                  fillOpacity={0.55}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 45px -30px rgb(15 23 42 / 0.45)' }}
                  formatter={(value, name, info) => [`${value}%`, info?.payload?.subject || name]}
                />
              </RadarChart>
            </ResponsiveContainer>
          )
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
        {chartData.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => onSelectSkillGap?.(item.raw)}
            className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left transition-all hover:border-primary/20 hover:bg-primary/5"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-800">{item.subject}</div>
              <div className="mt-1 text-xs text-slate-500">ค่าเฉลี่ย {item.mastery}%</div>
            </div>
            <ArrowUpRight size={16} className="shrink-0 text-slate-300" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default SkillGapRadarChart;
