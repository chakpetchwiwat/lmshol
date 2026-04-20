import React, { useMemo } from 'react';
import { BookOpen, CheckCircle2, Printer, X, XCircle } from 'lucide-react';
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

  if (!reportGoal) return null;

  const successCount = reportData?.report?.filter((record) => record.isSuccess).length || 0;
  const pendingCount = reportData?.report?.filter((record) => !record.isSuccess).length || 0;
  const goalTargetLabel = goalSource?.type === 'ANY'
    ? `เรียนจบ ${goalSource?.targetCount || 0} คอร์ส`
    : `เรียนจบ ${targetCourses.length} คอร์สที่ระบุ`;

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
            : (targetCourses.join(' | ') || '-'),
        },
        { label: 'พนักงานทั้งหมด', value: `${reportData?.report?.length || 0} คน` },
        { label: 'สำเร็จแล้ว', value: `${successCount} คน` },
        { label: 'ยังไม่ผ่าน', value: `${pendingCount} คน` },
      ],
      columns: ['พนักงาน', 'อีเมล', 'แผนก', 'ความคืบหน้า', 'สถานะ'],
      rows: (reportData?.report || []).map((record) => ([
        record.name || '-',
        record.email || '-',
        record.department || '-',
        `${record.completionCount} / ${record.targetCount}`,
        record.isSuccess ? 'สำเร็จ' : 'ยังไม่ผ่าน',
      ])),
      emptyMessage: 'ไม่สามารถโหลดข้อมูลรายงานได้',
    });
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-fade-in">
        <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-slide-up">
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
                          ? 'เป้าหมายนี้นับทุกคอร์สที่ผู้เรียนเรียนจบภายในช่วงเวลาของเป้าหมาย'
                          : `ต้องเรียนคอร์สที่ระบุ ${targetCourses.length} รายการ`}
                      </p>
                    </div>
                  </div>

                  {goalSource?.type === 'ANY' ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                      ไม่ได้ล็อกคอร์สเฉพาะ ระบบจะนับทุกคอร์สที่เรียนจบตามเงื่อนไขเป้าหมายนี้
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
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                    <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">พนักงานทั้งหมด</p>
                    <p className="text-3xl font-black text-slate-800">{reportData.report.length}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                    <p className="mb-1 text-[10px] font-bold uppercase text-emerald-500">ทำสำเร็จแล้ว</p>
                    <p className="text-3xl font-black text-emerald-600">{successCount}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-center">
                    <p className="mb-1 text-[10px] font-bold uppercase text-amber-500">อยู่ระหว่างดำเนินการ</p>
                    <p className="text-3xl font-black text-amber-600">{pendingCount}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-slate-50 text-slate-500">
                        <th className="p-4 text-left text-[10px] font-bold uppercase">พนักงาน</th>
                        <th className="p-4 text-left text-[10px] font-bold uppercase">แผนก</th>
                        <th className="p-4 text-center text-[10px] font-bold uppercase">ความคืบหน้า</th>
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
                              <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full ${record.isSuccess ? 'bg-emerald-500' : 'bg-primary'}`}
                                  style={{ width: `${Math.min(100, (record.completionCount / record.targetCount) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            {record.isSuccess ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                                <CheckCircle2 size={14} /> สำเร็จ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-400">
                                <XCircle size={14} /> ยังไม่ผ่าน
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
