import React from 'react';
import { CheckCircle2, Clock3 } from 'lucide-react';
import { formatThaiDateTime } from '../../utils/dateUtils';

const STATUS_STYLES = {
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  NOT_STARTED: 'bg-slate-100 text-slate-600',
};

const DashboardPerformanceTable = ({ rows, title, subtitle }) => {
  const safeRows = rows || [];

  return (
    <section className="card card-no-lift overflow-hidden p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="text-left">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
          {safeRows.length} รายการ
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              <th className="pb-4">ผู้เรียน</th>
              <th className="pb-4">คอร์ส</th>
              <th className="pb-4">สถานะ</th>
              <th className="pb-4">คะแนน</th>
              <th className="pb-4">เริ่มเรียน</th>
              <th className="pb-4">จบเมื่อ</th>
            </tr>
          </thead>
          <tbody>
            {safeRows.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 last:border-0">
                <td className="py-4 align-top">
                  <div className="font-bold text-slate-900">{item.userName}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {item.department || '-'}
                    {item.email ? ` • ${item.email}` : ''}
                  </div>
                </td>
                <td className="py-4 align-top">
                  <div className="font-semibold text-slate-800">{item.courseTitle}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.categoryName || '-'}</div>
                </td>
                <td className="py-4 align-top">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[item.status] || STATUS_STYLES.NOT_STARTED}`}>
                    {item.status === 'COMPLETED' ? 'เรียนจบ' : item.status === 'IN_PROGRESS' ? 'กำลังเรียน' : 'ยังไม่เริ่ม'}
                  </span>
                  <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                    {item.status === 'COMPLETED' ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
                    <span>{Number(item.progressPercent || 0).toFixed(0)}%</span>
                  </div>
                </td>
                <td className="py-4 align-top">
                  <div className="text-sm font-black text-slate-900">{item.score ?? '-'}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.quizLessonTitle || 'ยังไม่มีคะแนน'}</div>
                </td>
                <td className="py-4 align-top text-sm text-slate-600">{formatThaiDateTime(item.startedAt, true)}</td>
                <td className="py-4 align-top text-sm text-slate-600">
                  {item.completedAt ? formatThaiDateTime(item.completedAt, true) : '-'}
                </td>
              </tr>
            ))}
            {safeRows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-16 text-center text-sm font-medium text-slate-400">
                  ยังไม่มีข้อมูลผลการเรียนในช่วงเวลานี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default DashboardPerformanceTable;
