import React from 'react';
import { BookOpen, CheckCircle2, Target, Users } from 'lucide-react';

const formatValue = (value, suffix = '') => `${Number(value || 0).toLocaleString()}${suffix}`;

const StatCards = ({ stats, isFullAdmin }) => {
  const totalEnrollments = stats?.totalEnrollments || 0;
  const completedEnrollments = stats?.completedEnrollments || 0;
  const completionRate = totalEnrollments > 0
    ? ((completedEnrollments / totalEnrollments) * 100).toFixed(1)
    : '0.0';

  const statCardsData = isFullAdmin
    ? [
        {
          title: 'ผู้เรียนทั้งหมด',
          value: formatValue(stats?.totalUsers),
          detail: 'จำนวนพนักงานที่อยู่ในขอบเขตรายงานนี้',
          icon: <Users size={22} />,
          color: 'text-primary',
          bg: 'bg-primary-light',
        },
        {
          title: 'สำเร็จแล้ว',
          value: formatValue(completedEnrollments),
          detail: `จากทั้งหมด ${formatValue(totalEnrollments)} enrollment`,
          icon: <CheckCircle2 size={22} />,
          color: 'text-success',
          bg: 'bg-success-bg',
        },
        {
          title: 'Compliance Rate',
          value: `${stats?.complianceRate || '0.0'}%`,
          detail: 'อัตราการบรรลุเป้าหมายการเรียนของพนักงานทุกคน',
          icon: <Target size={22} />,
          color: 'text-warning',
          bg: 'bg-warning-bg',
        },
        {
          title: 'คะแนนเฉลี่ย',
          value: formatValue(stats?.averageQuizScore),
          detail: 'ค่าเฉลี่ยคะแนนล่าสุดของผู้เรียน',
          icon: <Target size={22} />,
          color: 'text-secondary',
          bg: 'bg-secondary/10',
        },
      ]
    : [
        {
          title: 'ผู้เรียนในทีม',
          value: formatValue(stats?.totalUsers),
          detail: 'สมาชิกในทีมที่อยู่ในรายงานนี้',
          icon: <Users size={22} />,
          color: 'text-primary',
          bg: 'bg-primary-light',
        },
        {
          title: 'สำเร็จแล้ว',
          value: formatValue(completedEnrollments),
          detail: `จากทั้งหมด ${formatValue(totalEnrollments)} enrollment`,
          icon: <CheckCircle2 size={22} />,
          color: 'text-success',
          bg: 'bg-success-bg',
        },
        {
          title: 'Compliance Rate',
          value: `${stats?.complianceRate || '0.0'}%`,
          detail: 'อัตราการบรรลุเป้าหมายการเรียนที่มอบหมาย',
          icon: <Target size={22} />,
          color: 'text-warning',
          bg: 'bg-warning-bg',
        },
        {
          title: 'คะแนนเฉลี่ย',
          value: formatValue(stats?.averageQuizScore),
          detail: 'คะแนนสอบล่าสุดเฉลี่ยของทีม',
          icon: <Target size={22} />,
          color: 'text-secondary',
          bg: 'bg-secondary/10',
        },
      ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {statCardsData.map((stat) => (
        <div
          key={stat.title}
          className="card card-no-lift flex min-h-[154px] items-start gap-4 border border-slate-200/80 p-5 transition-all hover:border-primary/20"
        >
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>
            {stat.icon}
          </div>
          <div className="min-w-0">
            <p className="text-left text-[11px] font-black uppercase tracking-[0.18em] text-muted">
              {stat.title}
            </p>
            <div className="mt-3 text-left text-3xl font-black text-slate-900">{stat.value}</div>
            <p className="mt-2 text-left text-sm leading-6 text-slate-500">{stat.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatCards;
