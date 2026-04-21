import React, { useMemo } from 'react';
import { BookOpen, CheckCircle2, Printer, Search, X, XCircle } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';
import { openPrintReport } from '../../utils/printUtils';

const GoalReportModal = ({
  reportGoal,
  reportData,
  reportLoading,
  onClose,
}) => {
  const goalSource = reportData?.goal || reportGoal;
  const targetCourses = useMemo(() => (
    (goalSource?.courses || [])
      .map((item) => item?.course?.title || item?.title || null)
      .filter(Boolean)
  ), [goalSource]);

  const numberedTargetCourses = useMemo(() => (
    targetCourses.map((courseTitle, index) => `${index + 1}. ${courseTitle}`).join('\n')
  ), [targetCourses]);

  const statusCounts = useMemo(() => {
    const counts = {
      COMPLETED: 0,
      IN_PROGRESS: 0,
      NOT_STARTED: 0,
    };
    reportData?.report?.forEach((record) => {
      const status = record.userStatus || (record.isSuccess ? 'COMPLETED' : 'IN_PROGRESS');
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [reportData]);

  if (!reportGoal) return null;

  const goalTargetLabel = goalSource?.type === 'ANY'
    ? `สำเร็จ ${goalSource?.targetCount || 0} คอร์ส`
    : `สำเร็จ ${targetCourses.length} คอร์สที่ระบุ`;

  const handlePrint = () => {
    openPrintReport({
      fileName: `goal-report-${goalSource?.title || 'report'}`,
      reportTitle: 'รายงานเป้าหมายการเรียน',
      subtitle: goalSource?.title,
      summary: [
        { label: 'เป้าหมาย', value: goalTargetLabel },
        {
          label: 'คอร์สในเป้าหมาย',
          value: goalSource?.type === 'ANY'
            ? 'นับทุกคอร์สที่เรียนจบภายในช่วงเวลาเป้าหมาย'
            : (numberedTargetCourses || '-'),
        },
        { label: 'พนักงานทั้งหมด', value: `${reportData?.report?.length || 0} คน` },
        { label: 'เรียนครบทั้งหมด', value: `${statusCounts.COMPLETED} คน` },
        { label: 'กำลังเรียน', value: `${statusCounts.IN_PROGRESS} คน` },
        { label: 'ยังไม่เริ่ม', value: `${statusCounts.NOT_STARTED} คน` },
      ],
      columns: ['พนักงาน', 'แผนก', 'ความคืบหน้า', 'สถานะ', 'รายละเอียด'],
      rows: (reportData?.report || []).map((record) => ([
        record.name || '-',
        record.department || '-',
        `${record.completionCount} / ${record.targetCount}`,
        record.userStatus === 'COMPLETED' ? 'สำเร็จ' : (record.userStatus === 'IN_PROGRESS' ? 'กำลังเรียน' : 'ยังไม่เริ่ม'),
        (record.courseProgress || []).map(cp =>
          `${cp.title}: ${cp.status === 'COMPLETED' ? 'เสร็จสิ้น' : (cp.progressPercent + '%')}`
        ).join('\n')
      ])),
      emptyMessage: 'ไม่สามารถโหลดข้อมูลรายงานได้',
    });
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-fade-in">
        <div className="flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-slide-up">
          <div className="flex items-center justify-between border-b border-border bg-slate-50 p-6">
            <div>
              <h3 className="text-xl font-black text-slate-800">รายงาน: {goalSource?.title}</h3>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                เป้าหมาย: {goalTargetLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary/8 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/12"
              >
                <Printer size={16} />
                <span>Print to PDF</span>
              </button>
              <button type="button" onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-slate-200">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {reportLoading ? (
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="animate-pulse text-sm font-bold uppercase text-slate-400">กำลังประมวลผลข้อมูลรายงาน...</p>
              </div>
            ) : reportData ? (
              <div className="space-y-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5">
                  <div className="mb-3 flex items-center gap-3 text-slate-800">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">คอร์สในเป้าหมาย</h4>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {goalSource?.type === 'ANY'
                          ? 'เป้าหมายนี้นับทุกคอร์สที่ผู้เรียนเรียนสำเร็จภายในช่วงเวลาของเป้าหมาย'
                          : `ต้องเรียนคอร์สที่ระบุ ${targetCourses.length} รายการ`}
                      </p>
                    </div>
                  </div>

                  {goalSource?.type === 'ANY' ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                      ไม่ได้ล็อกคอร์สเฉพาะ ระบบจะนับทุกคอร์สที่เรียนสำเร็จตามเงื่อนไขเป้าหมายนี้
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {targetCourses.length > 0 ? targetCourses.map((courseTitle) => (
                        <span
                          key={courseTitle}
                          className="inline-flex rounded-full border border-primary/15 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm"
                        >
                          {courseTitle}
                        </span>
                      )) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                          ไม่พบรายการคอร์สที่ระบุในเป้าหมายนี้
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                    <p className="mb-1 text-[10px] font-bold uppercase text-emerald-500">สำเร็จตามเป้าหมาย</p>
                    <p className="text-3xl font-black text-emerald-600">{statusCounts.COMPLETED}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-center">
                    <p className="mb-1 text-[10px] font-bold uppercase text-amber-500">กำลังเรียน</p>
                    <p className="text-3xl font-black text-amber-600">{statusCounts.IN_PROGRESS}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                    <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">ยังไม่เริ่ม</p>
                    <p className="text-3xl font-black text-slate-800">{statusCounts.NOT_STARTED}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-slate-50 text-slate-500">
                        <th className="p-4 text-left text-[10px] font-bold uppercase">พนักงาน</th>
                        <th className="p-4 text-left text-[10px] font-bold uppercase">แผนก</th>
                        <th className="p-4 text-center text-[10px] font-bold uppercase">ความคืบหน้า</th>
                        <th className="p-4 text-left text-[10px] font-bold uppercase">รายละเอียดรายคอร์ส</th>
                        <th className="p-4 text-right text-[10px] font-bold uppercase">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.report.map((record) => (
                        <tr key={record.userId} className="border-b border-slate-50 transition-colors hover:bg-slate-50/50">
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{record.name}</div>
                            <div className="text-[10px] text-slate-400">{record.email}</div>
                          </td>
                          <td className="p-4 font-medium text-slate-600">{record.department}</td>
                          <td className="p-4">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-black text-slate-800">{record.completionCount} / {record.targetCount}</span>
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full ${record.userStatus === 'COMPLETED' ? 'bg-emerald-500' : 'bg-primary'}`}
                                  style={{ width: `${Math.min(100, (record.completionCount / record.targetCount) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-2">
                              {(record.courseProgress || []).map((cp) => (
                                <div key={cp.courseId} className="flex items-center gap-2">
                                  <div className="flex-1 truncate text-xs font-semibold text-slate-600" title={cp.title}>
                                    {cp.title}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                                      <div
                                        className={`h-full ${cp.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-blue-400'}`}
                                        style={{ width: `${cp.progressPercent}%` }}
                                      />
                                    </div>
                                    <span className={`min-w-[45px] text-[10px] font-bold ${cp.status === 'COMPLETED' ? 'text-emerald-600' : (cp.status === 'IN_PROGRESS' ? 'text-blue-500' : 'text-slate-400')}`}>
                                      {cp.status === 'COMPLETED' ? 'สำเร็จ' : (cp.status === 'IN_PROGRESS' ? `${Math.round(cp.progressPercent)}%` : 'ยังไม่เริ่ม')}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            {record.userStatus === 'COMPLETED' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                                <CheckCircle2 size={14} /> สำเร็จ
                              </span>
                            ) : record.userStatus === 'IN_PROGRESS' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                                <Search size={14} /> กำลังเรียน
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-400">
                                <XCircle size={14} /> ยังไม่เริ่ม
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center font-bold text-slate-400">ไม่สามารถโหลดข้อมูลรายงานได้</div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default GoalReportModal;
