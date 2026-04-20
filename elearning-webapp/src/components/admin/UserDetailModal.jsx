import React, { useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  FileDown,
  Gift,
  Printer,
  TrendingDown,
  TrendingUp,
  User2,
  X,
} from 'lucide-react';
import { formatThaiDateTime } from '../../utils/dateUtils';
import ModalPortal from '../common/ModalPortal';
import CustomSelect from '../common/CustomSelect';
import { useToast } from '../../context/useToast';
import { FILTER_VALUES } from '../../utils/constants/filters';
import { ENROLLMENT_STATUS } from '../../utils/constants/statuses';
import { openPrintReport } from '../../utils/printUtils';

const UserDetailModalContent = ({ loading, detail, onClose }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('learning');
  const [filterMonth, setFilterMonth] = useState(FILTER_VALUES.ALL);
  const [filterYear, setFilterYear] = useState(FILTER_VALUES.ALL);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, index) => currentYear - index);
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  const enrollments = detail?.enrollments || [];
  const pointsHistory = detail?.pointsHistory || [];

  const filteredEnrollments = enrollments.filter((enrollment) => {
    const date = new Date(enrollment.startedAt);
    const monthMatch = filterMonth === FILTER_VALUES.ALL || date.getMonth() === parseInt(filterMonth, 10);
    const yearMatch = filterYear === FILTER_VALUES.ALL || date.getFullYear() === parseInt(filterYear, 10);
    return monthMatch && yearMatch;
  });

  const filteredPointsHistory = pointsHistory.filter((entry) => {
    const date = new Date(entry.createdAt);
    const monthMatch = filterMonth === FILTER_VALUES.ALL || date.getMonth() === parseInt(filterMonth, 10);
    const yearMatch = filterYear === FILTER_VALUES.ALL || date.getFullYear() === parseInt(filterYear, 10);
    return monthMatch && yearMatch;
  });

  const handleExport = () => {
    const data = activeTab === 'learning' ? filteredEnrollments : filteredPointsHistory;
    if (data.length === 0) {
      toast.info('ไม่มีข้อมูลสำหรับการส่งออก');
      return;
    }

    let csvContent = '\uFEFF';
    csvContent += `ประวัติผู้ใช้งานรายบุคคล (${activeTab === 'learning' ? 'ประวัติการเรียน' : 'ประวัติ Point'})\n`;
    csvContent += `พนักงาน,${detail.name}\n`;
    csvContent += `อีเมล,${detail.email}\n`;
    csvContent += `แผนก,${detail.department || '-'}\n`;
    csvContent += `ระดับ,${detail.tier?.name || detail.tier || '-'}\n`;
    csvContent += `แต้มคงเหลือ,${detail.pointsBalance || 0}\n`;
    csvContent += `วันที่ส่งออก,${formatThaiDateTime(new Date())}\n\n`;

    if (activeTab === 'learning') {
      csvContent += 'คอร์ส,หมวดหมู่,เริ่มเรียน,เรียนจบ,ความคืบหน้า,สถานะ\n';
      data.forEach((item) => {
        const started = item.startedAt ? formatThaiDateTime(item.startedAt) : '-';
        const completed = item.completedAt ? formatThaiDateTime(item.completedAt) : '-';
        const status = item.status === ENROLLMENT_STATUS.COMPLETED ? 'เรียนจบแล้ว' : 'กำลังเรียน';
        csvContent += `"${item.course.title}","${item.course.categoryName || '-'}","${started}","${completed}","${Math.round(item.progressPercent || 0)}%","${status}"\n`;
      });
    } else {
      csvContent += 'ประเภท,ที่มา/การใช้งาน,หมายเหตุ,Point,เวลา\n';
      data.forEach((item) => {
        const time = item.createdAt ? formatThaiDateTime(item.createdAt) : '-';
        const type = item.points >= 0 ? 'ได้รับแต้ม' : 'ใช้แต้ม';
        csvContent += `"${type}","${item.sourceLabel}","${item.note || '-'}","${item.points}","${time}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileName = `Export_${activeTab === 'learning' ? 'Learning' : 'Points'}_${detail.name}_${formatThaiDateTime(new Date()).replace(/\//g, '-')}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const data = activeTab === 'learning' ? filteredEnrollments : filteredPointsHistory;

    openPrintReport({
      fileName: `user-history-${detail?.name || 'report'}-${activeTab}`,
      reportTitle: 'ประวัติผู้ใช้งานรายบุคคล',
      subtitle: `${detail?.name || '-'} · ${activeTab === 'learning' ? 'ประวัติการเรียน' : 'ประวัติ Point'}`,
      summary: [
        { label: 'พนักงาน', value: detail?.name || '-' },
        { label: 'อีเมล', value: detail?.email || '-' },
        { label: 'แผนก', value: detail?.department || '-' },
        { label: 'ระดับ', value: detail?.tier?.name || detail?.tier || '-' },
        { label: 'เธงเธฑเธเน€เธฃเธดเนเธกเธเธฒเธ', value: detail?.employmentDate ? formatThaiDateTime(detail.employmentDate) : '-' },
        { label: 'Point Balance', value: `${detail?.pointsBalance?.toLocaleString?.() || 0}` },
      ],
      filters: [
        { label: 'มุมมอง', value: activeTab === 'learning' ? 'ประวัติการเรียน' : 'ประวัติ Point' },
        { label: 'เดือน', value: filterMonth === FILTER_VALUES.ALL ? 'ทุกเดือน' : months[parseInt(filterMonth, 10)] || 'ทุกเดือน' },
        { label: 'ปี', value: filterYear === FILTER_VALUES.ALL ? 'ทุกปี' : String(parseInt(filterYear, 10) + 543) },
      ],
      columns: activeTab === 'learning'
        ? ['คอร์ส', 'หมวดหมู่', 'เริ่มเรียน', 'เรียนจบ', 'ความคืบหน้า', 'สถานะ']
        : ['ประเภท', 'ที่มา / การใช้งาน', 'หมายเหตุ', 'Point', 'เวลา'],
      rows: activeTab === 'learning'
        ? data.map((item) => ([
            item.course?.title || '-',
            item.course?.categoryName || '-',
            item.startedAt ? formatThaiDateTime(item.startedAt) : '-',
            item.completedAt ? formatThaiDateTime(item.completedAt) : '-',
            `${Math.round(item.progressPercent || 0)}%`,
            item.status === ENROLLMENT_STATUS.COMPLETED ? 'เรียนจบแล้ว' : 'กำลังเรียน',
          ]))
        : data.map((item) => ([
            item.points >= 0 ? 'ได้รับแต้ม' : 'ใช้แต้ม',
            item.sourceLabel || '-',
            item.note || (item.points >= 0 ? 'ได้รับ Point' : 'ใช้ Point'),
            `${item.points}`,
            item.createdAt ? formatThaiDateTime(item.createdAt) : '-',
          ])),
      emptyMessage: activeTab === 'learning'
        ? 'ไม่พบประวัติการลงเรียนตามเงื่อนไขที่เลือก'
        : 'ไม่พบประวัติ Point ตามเงื่อนไขที่เลือก',
    });
  };

  return (
    <ModalPortal isOpen>
      <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
        <div className="card flex max-h-[92vh] w-full max-w-5xl flex-col border border-slate-100 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <h3 className="text-xl font-black text-slate-900">ประวัติผู้ใช้งานรายบุคคล</h3>
              <p className="mt-1 text-sm text-slate-500">ดูทั้งประวัติการเรียนและประวัติการได้ใช้แต้มในหน้าต่างเดียว</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="ปิดหน้าต่างประวัติผู้ใช้งาน"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {loading ? (
              <div className="py-20 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : !detail ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
                ไม่พบข้อมูลผู้ใช้งาน
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                    <div className="mb-3 inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                      <User2 size={18} />
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">พนักงาน</div>
                    <div className="mt-2 text-lg font-black text-slate-900">{detail.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{detail.email}</div>
                  </div>

                  <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                    <div className="mb-3 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-600">
                      <CalendarDays size={18} />
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">เริ่มงาน</div>
                    <div className="mt-2 text-lg font-black text-slate-900">{formatThaiDateTime(detail.employmentDate)}</div>
                    <div className="mt-1 text-sm text-slate-500">วันที่เริ่มเป็นพนักงานในระบบ</div>
                  </div>

                  <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                    <div className="mb-3 inline-flex rounded-2xl bg-amber-100 p-3 text-amber-600">
                      <Clock3 size={18} />
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">แผนก / ระดับ</div>
                    <div className="mt-2 text-lg font-black text-slate-900">{detail.department || '-'}</div>
                    <div className="mt-1 text-sm text-slate-500">{detail.tier?.name || detail.tier || 'ยังไม่ได้กำหนดระดับ'}</div>
                  </div>

                  <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                    <div className="mb-3 inline-flex rounded-2xl bg-sky-100 p-3 text-sky-600">
                      <Coins size={18} />
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Point Balance</div>
                    <div className="mt-2 text-lg font-black text-slate-900">{detail.pointsBalance?.toLocaleString?.() || 0}</div>
                    <div className="mt-1 text-sm text-slate-500">แต้มคงเหลือล่าสุดของผู้ใช้งาน</div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h4 className="text-base font-black text-slate-900">ข้อมูลย้อนหลัง</h4>
                        <p className="mt-1 text-sm text-slate-500">สลับดูประวัติการเรียนหรือประวัติ Point ได้ตามต้องการ</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <CustomSelect
                            className="w-44"
                            size="sm"
                            value={filterMonth}
                            onChange={(event) => setFilterMonth(event.target.value)}
                            options={[
                              { value: FILTER_VALUES.ALL, label: 'ทุกเดือน' },
                              ...months.map((month, index) => ({ value: index.toString(), label: month })),
                            ]}
                          />
                          <CustomSelect
                            className="w-36"
                            size="sm"
                            value={filterYear}
                            onChange={(event) => setFilterYear(event.target.value)}
                            options={[
                              { value: FILTER_VALUES.ALL, label: 'ทุกปี' },
                              ...years.map((year) => ({ value: year.toString(), label: (year + 543).toString() })),
                            ]}
                          />
                        </div>

                        <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                          <button
                            type="button"
                            onClick={() => setActiveTab('learning')}
                            className={`rounded-2xl px-4 py-2 text-sm font-bold transition-colors ${activeTab === 'learning' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
                          >
                            ประวัติการเรียน
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('points')}
                            className={`rounded-2xl px-4 py-2 text-sm font-bold transition-colors ${activeTab === 'points' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
                          >
                            ประวัติ Point
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleExport}
                          className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-600 transition-all hover:bg-emerald-100 active:scale-95"
                        >
                          <FileDown size={18} />
                          <span>Export Excel</span>
                        </button>

                        <button
                          type="button"
                          onClick={handlePrint}
                          className="flex items-center gap-2 rounded-2xl bg-primary/8 px-4 py-2 text-sm font-bold text-primary transition-all hover:bg-primary/12 active:scale-95"
                        >
                          <Printer size={18} />
                          <span>Print to PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {activeTab === 'learning' ? (
                    filteredEnrollments.length === 0 ? (
                      <div className="px-5 py-12 text-center text-sm text-slate-500">ไม่พบประวัติการลงเรียนตามเงื่อนไขที่เลือก</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse text-left">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-sm text-slate-500">
                              <th className="px-5 py-3 font-semibold">คอร์ส</th>
                              <th className="px-5 py-3 font-semibold">หมวดหมู่</th>
                              <th className="px-5 py-3 font-semibold">เริ่มเรียน</th>
                              <th className="px-5 py-3 font-semibold">เรียนจบ</th>
                              <th className="px-5 py-3 font-semibold">ความคืบหน้า</th>
                              <th className="px-5 py-3 font-semibold">สถานะ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredEnrollments.map((enrollment) => (
                              <tr key={enrollment.id} className="border-b border-slate-100 last:border-b-0">
                                <td className="px-5 py-4">
                                  <div className="font-bold text-slate-900">{enrollment.course.title}</div>
                                  <div className="mt-1 text-xs text-slate-400">แต้มคอร์ส {enrollment.course.points || 0}</div>
                                </td>
                                <td className="px-5 py-4 text-sm text-slate-600">{enrollment.course.categoryName || '-'}</td>
                                <td className="px-5 py-4 text-sm text-slate-600">{formatThaiDateTime(enrollment.startedAt)}</td>
                                <td className="px-5 py-4 text-sm text-slate-600">{formatThaiDateTime(enrollment.completedAt)}</td>
                                <td className="px-5 py-4 text-sm font-semibold text-slate-700">{Math.round(enrollment.progressPercent || 0)}%</td>
                                <td className="px-5 py-4">
                                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                    enrollment.status === ENROLLMENT_STATUS.COMPLETED
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {enrollment.status === ENROLLMENT_STATUS.COMPLETED ? 'เรียนจบแล้ว' : 'กำลังเรียน'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : filteredPointsHistory.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-slate-500">ไม่พบประวัติ Point ตามเงื่อนไขที่เลือก</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] border-collapse text-left">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50 text-sm text-slate-500">
                            <th className="px-5 py-3 font-semibold">ประเภท</th>
                            <th className="px-5 py-3 font-semibold">ที่มา / การใช้งาน</th>
                            <th className="px-5 py-3 font-semibold">หมายเหตุ</th>
                            <th className="px-5 py-3 text-right font-semibold">Point</th>
                            <th className="px-5 py-3 font-semibold">เวลา</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPointsHistory.map((entry) => (
                            <tr key={entry.id} className="border-b border-slate-100 last:border-b-0">
                              <td className="px-5 py-4">
                                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                                  entry.points >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                }`}>
                                  {entry.points >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                  {entry.points >= 0 ? 'ได้รับแต้ม' : 'ใช้แต้ม'}
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="font-bold text-slate-900">{entry.sourceLabel}</div>
                                <div className="mt-1 text-xs text-slate-400">{entry.sourceType}</div>
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-600">
                                {entry.note || (entry.points >= 0 ? 'ได้รับ Point' : 'ใช้ Point')}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <span className={`text-sm font-black ${entry.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {entry.points > 0 ? `+${entry.points}` : entry.points}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-600">{formatThaiDateTime(entry.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                    <div className="mb-2 flex items-center gap-2 text-slate-400">
                      <CheckCircle2 size={16} />
                      <span className="text-xs font-bold uppercase tracking-[0.18em]">เรียนจบ</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      {enrollments.filter((item) => item.status === ENROLLMENT_STATUS.COMPLETED).length}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                    <div className="mb-2 flex items-center gap-2 text-slate-400">
                      <TrendingUp size={16} />
                      <span className="text-xs font-bold uppercase tracking-[0.18em]">ได้รับ Point</span>
                    </div>
                    <div className="text-2xl font-black text-emerald-600">
                      {pointsHistory.filter((item) => item.points > 0).reduce((sum, item) => sum + item.points, 0)}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                    <div className="mb-2 flex items-center gap-2 text-slate-400">
                      <Gift size={16} />
                      <span className="text-xs font-bold uppercase tracking-[0.18em]">ใช้ Point</span>
                    </div>
                    <div className="text-2xl font-black text-rose-600">
                      {Math.abs(pointsHistory.filter((item) => item.points < 0).reduce((sum, item) => sum + item.points, 0))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

const UserDetailModal = ({ isOpen, loading, detail, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <UserDetailModalContent
      key={detail?.id || 'user-detail'}
      loading={loading}
      detail={detail}
      onClose={onClose}
    />
  );
};

export default UserDetailModal;
