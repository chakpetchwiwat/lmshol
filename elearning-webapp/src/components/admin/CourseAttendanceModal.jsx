import React from 'react';
import { CalendarClock, Printer, Search, Users, X } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import { formatThaiDateTime } from '../../utils/dateUtils';
import ModalPortal from '../common/ModalPortal';
import CustomSelect from '../common/CustomSelect';
import { ENROLLMENT_STATUS } from '../../utils/constants/statuses';
import { openPrintReport } from '../../utils/printUtils';
import { useToast } from '../../context/useToast';
import UserDetailModal from './UserDetailModal';
import UserLink from './UserLink';
import { ENROLLMENT_STATUS_LABELS } from '../../utils/constants/dashboard';

const STATUS_OPTIONS = [
  { value: '', label: 'ทั้งหมด' },
  { value: ENROLLMENT_STATUS.COMPLETED, label: 'สำเร็จแล้ว' },
  { value: ENROLLMENT_STATUS.IN_PROGRESS, label: 'กำลังเรียน' },
  { value: ENROLLMENT_STATUS.NOT_STARTED, label: 'ยังไม่เริ่มเรียน' },
];

const DATE_FIELD_OPTIONS = [
  { value: 'startedAt', label: 'วันที่เริ่มเรียน' },
  { value: 'completedAt', label: 'สำเร็จเมื่อ' },
];




const SUMMARY_CARD_STYLES = {
  completed: {
    iconClassName: 'bg-emerald-100 text-emerald-600',
    borderClassName: 'border-emerald-100',
    bgClassName: 'bg-emerald-50/70',
  },
  inProgress: {
    iconClassName: 'bg-blue-100 text-blue-600',
    borderClassName: 'border-blue-100',
    bgClassName: 'bg-blue-50/70',
  },
  notStarted: {
    iconClassName: 'bg-slate-200 text-slate-600',
    borderClassName: 'border-slate-200',
    bgClassName: 'bg-slate-50',
  },
};

const getStatusBadge = (status) => {
  if (status === ENROLLMENT_STATUS.COMPLETED) {
    return <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">สำเร็จแล้ว</span>;
  }

  if (status === ENROLLMENT_STATUS.IN_PROGRESS) {
    return <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">กำลังเรียน</span>;
  }

  return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">ยังไม่เริ่มเรียน</span>;
};

const getProgressTone = (status, progressPercent) => {
  if (status === ENROLLMENT_STATUS.COMPLETED || progressPercent >= 100) {
    return 'bg-emerald-500';
  }

  if (status === ENROLLMENT_STATUS.NOT_STARTED || progressPercent <= 0) {
    return 'bg-slate-300';
  }

  return 'bg-blue-500';
};

const CourseAttendanceModal = ({ isOpen, onClose, course, departments, tiers }) => {
  const toast = useToast();
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showUserDetailModal, setShowUserDetailModal] = React.useState(false);
  const [userDetailLoading, setUserDetailLoading] = React.useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = React.useState(null);
  const [filters, setFilters] = React.useState({
    departmentId: '',
    tierId: '',
    month: '',
    year: new Date().getFullYear().toString(),
    status: '',
    dateField: 'startedAt',
  });
  const courseTitle = course?.title?.trim() || 'ไม่ระบุชื่อคอร์ส';

  const months = [
    { value: '', label: 'ทุกเดือน' },
    { value: '01', label: 'มกราคม' },
    { value: '02', label: 'กุมภาพันธ์' },
    { value: '03', label: 'มีนาคม' },
    { value: '04', label: 'เมษายน' },
    { value: '05', label: 'พฤษภาคม' },
    { value: '06', label: 'มิถุนายน' },
    { value: '07', label: 'กรกฎาคม' },
    { value: '08', label: 'สิงหาคม' },
    { value: '09', label: 'กันยายน' },
    { value: '10', label: 'ตุลาคม' },
    { value: '11', label: 'พฤศจิกายน' },
    { value: '12', label: 'ธันวาคม' },
  ];

  const currentYear = new Date().getFullYear();
  const years = [
    { value: '', label: 'ทุกปี' },
    { value: currentYear.toString(), label: String(currentYear + 543) },
    { value: (currentYear - 1).toString(), label: String(currentYear + 542) },
    { value: (currentYear - 2).toString(), label: String(currentYear + 541) },
  ];

  React.useEffect(() => {
    if (!isOpen || !course) {
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const params = {};
        if (filters.departmentId) params.departmentId = filters.departmentId;
        if (filters.tierId) params.tierId = filters.tierId;
        if (filters.status) params.status = filters.status;
        if (filters.dateField) params.dateField = filters.dateField;
        if (filters.month) params.month = filters.month;
        if (filters.month && filters.year) params.year = filters.year;

        const response = await adminAPI.getCourseHistory(course.id, params);
        setHistory(response.data || []);
      } catch (error) {
        console.error('Failed to fetch course history', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [course, filters.dateField, filters.departmentId, filters.month, filters.status, filters.tierId, filters.year, isOpen]);

  const statusSummary = React.useMemo(() => ({
    completed: history.filter((record) => record.status === ENROLLMENT_STATUS.COMPLETED).length,
    inProgress: history.filter((record) => record.status === ENROLLMENT_STATUS.IN_PROGRESS).length,
    notStarted: history.filter((record) => record.status === ENROLLMENT_STATUS.NOT_STARTED).length,
  }), [history]);

  const summaryCards = React.useMemo(() => ([
    {
      key: 'completed',
      label: 'สำเร็จแล้ว',
      value: statusSummary.completed,
      helper: 'ผู้ที่เรียนครบและปิดคอร์สแล้ว',
    },
    {
      key: 'inProgress',
      label: 'กำลังเรียน',
      value: statusSummary.inProgress,
      helper: 'ผู้ที่เริ่มเรียนแล้วแต่ยังไม่ครบ',
    },
    {
      key: 'notStarted',
      label: 'ยังไม่เริ่มเรียน',
      value: statusSummary.notStarted,
      helper: 'ผู้ที่เข้าถึงคอร์สได้แต่ยังไม่เริ่ม',
    },
  ]), [statusSummary]);

  const handleViewUser = async (userId) => {
    if (!userId) {
      return;
    }

    try {
      setShowUserDetailModal(true);
      setUserDetailLoading(true);
      const response = await adminAPI.getUserDetails(userId);
      setSelectedUserDetail(response.data);
    } catch (error) {
      console.error('Failed to fetch user detail', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถโหลดประวัติพนักงานได้');
      setShowUserDetailModal(false);
    } finally {
      setUserDetailLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      departmentId: '',
      tierId: '',
      month: '',
      year: new Date().getFullYear().toString(),
      status: '',
      dateField: 'startedAt',
    });
  };

  const handlePrint = () => {
    openPrintReport({
      fileName: `course-attendance-${courseTitle || 'report'}`,
      reportTitle: 'ประวัติการเข้าเรียน',
      subtitle: `คอร์ส: ${courseTitle}`,
      summary: [
        { label: 'ชื่อคอร์ส', value: courseTitle },
        { label: 'จำนวนผู้เรียนตามตัวกรอง', value: `${history.length} รายการ` },
        { label: 'สำเร็จแล้ว', value: `${statusSummary.completed} คน` },
        { label: 'กำลังเรียน', value: `${statusSummary.inProgress} คน` },
        { label: 'ยังไม่เริ่มเรียน', value: `${statusSummary.notStarted} คน` },
      ],
      filters: [
        { label: 'คอร์ส', value: courseTitle },
        { label: 'แผนก', value: departments.find((department) => department.id === filters.departmentId)?.name || 'ทั้งหมด' },
        { label: 'ตำแหน่ง', value: tiers.find((tier) => tier.id === filters.tierId)?.name || 'ทั้งหมด' },
        { label: 'สถานะ', value: STATUS_OPTIONS.find((option) => option.value === filters.status)?.label || 'ทั้งหมด' },
        { label: 'อิงวันที่', value: DATE_FIELD_OPTIONS.find((option) => option.value === filters.dateField)?.label || 'วันที่เริ่มเรียน' },
        { label: 'เดือน', value: months.find((month) => month.value === filters.month)?.label || 'ทุกเดือน' },
        { label: 'ปี', value: filters.month ? (years.find((year) => year.value === filters.year)?.label || 'ทุกปี') : 'ทุกปี' },
      ],
      columns: ['ชื่อผู้เรียน', 'แผนก / ระดับ', 'เริ่มเรียน', 'สถานะ', 'ความคืบหน้า', 'คะแนนแบบทดสอบ', 'สำเร็จเมื่อ'],
      rows: history.map((record) => ([
        record.user?.name || '-',
        [record.user?.department, record.user?.tier].filter(Boolean).join(' / ') || '-',
        record.startedAt ? formatThaiDateTime(record.startedAt, true) : '-',
        ENROLLMENT_STATUS_LABELS[record.status] || 'ยังไม่เริ่มเรียน',
        `${Math.round(record.progressPercent || 0)}%`,
        record.quizScore !== null && record.quizScore !== undefined
          ? `${record.quizScore}${record.quizPassed ? ' (ผ่าน)' : ' (ไม่ผ่าน)'}`
          : '-',
        record.completedAt ? formatThaiDateTime(record.completedAt, true) : '-',
      ])),
      emptyMessage: 'ไม่พบประวัติผู้เข้าเรียนตามเงื่อนไขที่เลือก',
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <ModalPortal isOpen={isOpen}>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
          <div className="card flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden bg-white p-0 shadow-2xl" style={{ isolation: 'isolate' }}>
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-5 rounded-t-[inherit]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Users size={20} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-800">ประวัติการเข้าเรียน</h4>
                <p className="text-sm font-medium text-slate-500">คอร์ส: {courseTitle}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700">
              <X size={20} />
            </button>
          </div>

          <div className="border-b border-slate-100 bg-white p-5">
            <div className="flex flex-wrap items-end gap-4">
              <CustomSelect
                label="แผนก"
                className="min-w-[200px] flex-1"
                value={filters.departmentId}
                onChange={(event) => setFilters({ ...filters, departmentId: event.target.value })}
                options={[
                  { value: '', label: 'ทั้งหมด' },
                  ...departments.map((department) => ({ value: department.id, label: department.name })),
                ]}
              />

              <CustomSelect
                label="ระดับผู้ใช้งาน"
                className="w-full sm:w-48"
                value={filters.tierId}
                onChange={(event) => setFilters({ ...filters, tierId: event.target.value })}
                options={[
                  { value: '', label: 'ทั้งหมด' },
                  ...tiers.map((tier) => ({ value: tier.id, label: tier.name })),
                ]}
              />

              <CustomSelect
                label="สถานะ"
                className="w-full sm:w-44"
                value={filters.status}
                onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                options={STATUS_OPTIONS}
              />

              <CustomSelect
                label="อิงวันที่"
                className="w-full sm:w-44"
                value={filters.dateField}
                onChange={(event) => setFilters({ ...filters, dateField: event.target.value })}
                options={DATE_FIELD_OPTIONS}
              />

              <CustomSelect
                label="เดือน"
                className="w-full sm:w-44"
                value={filters.month}
                onChange={(event) => setFilters({ ...filters, month: event.target.value })}
                options={months}
              />

              <CustomSelect
                label="ปี"
                className="w-full sm:w-36"
                value={filters.year}
                disabled={!filters.month}
                onChange={(event) => setFilters({ ...filters, year: event.target.value })}
                options={years}
              />

              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100"
              >
                ล้างตัวกรอง
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 px-4 py-2.5 text-sm font-black text-primary transition-all hover:from-primary/15 hover:to-primary/10 active:scale-95 shadow-sm shadow-primary/5"
              >
                <Printer size={16} />
                <span>Print to PDF</span>
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              {summaryCards.map((card) => {
                const style = SUMMARY_CARD_STYLES[card.key];

                return (
                  <div
                    key={card.key}
                    className={`rounded-3xl border p-4 ${style.borderClassName} ${style.bgClassName}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-500">{card.label}</p>
                        <p className="mt-2 text-3xl font-black text-slate-800">{card.value}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{card.helper}</p>
                      </div>
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${style.iconClassName}`}>
                        <CalendarClock size={18} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-slate-50/50 rounded-b-[inherit]">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <Search size={32} />
                </div>
                <p className="font-medium">ไม่พบประวัติผู้เข้าเรียนตามเงื่อนไขที่เลือก</p>
              </div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 bg-white/95 shadow-sm backdrop-blur">
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="p-4 font-bold">ชื่อผู้เรียน</th>
                    <th className="p-4 font-bold">แผนก / ระดับ</th>
                    <th className="p-4 font-bold">วันที่เริ่มเรียน</th>
                    <th className="p-4 font-bold">สถานะ</th>
                    <th className="p-4 font-bold">ความคืบหน้า</th>
                    <th className="p-4 font-bold">คะแนนแบบทดสอบ</th>
                    <th className="p-4 font-bold">สำเร็จเมื่อ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {history.map((record) => {
                    const progressPercent = Math.max(0, Math.min(100, Math.round(record.progressPercent || 0)));

                    return (
                      <tr key={record.id} className="transition-colors hover:bg-slate-50/50">
                        <td className="p-4">
                          <UserLink
                            userId={record.user?.id}
                            userName={record.user?.name}
                            onViewUser={handleViewUser}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1 text-sm text-slate-600">
                            <span className="font-medium">{record.user?.department || '-'}</span>
                            <span className="w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-400">
                              {record.user?.tier || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-sm font-medium text-slate-600">
                          {record.startedAt ? formatThaiDateTime(record.startedAt, true) : '-'}
                        </td>
                        <td className="p-4">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="p-4">
                          <div className="flex min-w-[160px] flex-col gap-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                              <span>{ENROLLMENT_STATUS_LABELS[record.status] || 'ยังไม่เริ่มเรียน'}</span>
                              <span>{progressPercent}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${getProgressTone(record.status, progressPercent)}`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {record.quizScore !== null && record.quizScore !== undefined ? (
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-slate-700">{record.quizScore}</span>
                              {record.quizPassed ? (
                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">ผ่าน</span>
                              ) : (
                                <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">ไม่ผ่าน</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-4 text-sm font-medium text-slate-500">
                          {record.completedAt ? formatThaiDateTime(record.completedAt, true) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          </div>
        </div>
      </ModalPortal>

      <UserDetailModal
        isOpen={showUserDetailModal}
        loading={userDetailLoading}
        detail={selectedUserDetail}
        onClose={() => {
          setShowUserDetailModal(false);
          setSelectedUserDetail(null);
        }}
      />
    </>
  );
};

export default CourseAttendanceModal;
