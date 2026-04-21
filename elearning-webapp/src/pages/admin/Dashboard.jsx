import React, { useEffect, useMemo, useState } from 'react';
import { Building2, FileDown, SlidersHorizontal } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { canEditAdminUsers } from '../../utils/roles';
import { USER_ROLES } from '../../utils/constants/roles';
import { formatThaiDateTime } from '../../utils/dateUtils';
import { openPrintReport } from '../../utils/printUtils';

import StatCards from '../../components/admin/StatCards';
import WeeklyActivityChart from '../../components/admin/WeeklyActivityChart';
import MajorGroupChart from '../../components/admin/MajorGroupChart';
import CategoryDistributionChart from '../../components/admin/CategoryDistributionChart';
import PopularCoursesTable from '../../components/admin/PopularCoursesTable';
import SkillGapRadarChart from '../../components/admin/SkillGapRadarChart';
import DepartmentLeaderboard from '../../components/admin/DepartmentLeaderboard';
import IncentiveROITrend from '../../components/admin/IncentiveROITrend';
import RiskIdentificationWidget from '../../components/admin/RiskIdentificationWidget';
import DashboardInsightModal from '../../components/admin/DashboardInsightModal';
import DashboardPerformanceTable from '../../components/admin/DashboardPerformanceTable';
import UserDetailModal from '../../components/admin/UserDetailModal';

const MONTH_OPTIONS = [
  { value: '', label: 'ทุกเดือน' },
  { value: '1', label: 'มกราคม' },
  { value: '2', label: 'กุมภาพันธ์' },
  { value: '3', label: 'มีนาคม' },
  { value: '4', label: 'เมษายน' },
  { value: '5', label: 'พฤษภาคม' },
  { value: '6', label: 'มิถุนายน' },
  { value: '7', label: 'กรกฎาคม' },
  { value: '8', label: 'สิงหาคม' },
  { value: '9', label: 'กันยายน' },
  { value: '10', label: 'ตุลาคม' },
  { value: '11', label: 'พฤศจิกายน' },
  { value: '12', label: 'ธันวาคม' },
];

const SKILL_LABELS = {
  STRAT_BUSINESS: 'Business Acumen / Corporate Knowledge',
  STRAT_CORE: 'Core / Soft Skills',
  STRAT_FUNCTIONAL: 'Functional Skills',
  STRAT_LEADERSHIP: 'Leadership Skills',
  STRAT_COMPLIANCE: 'Compliance',
  STRAT_DIGITAL: 'Digital / Future Skills',
};

const STATUS_LABELS = {
  COMPLETED: 'เรียนจบ',
  IN_PROGRESS: 'กำลังเรียน',
  NOT_STARTED: 'ยังไม่เริ่ม',
};

const safeValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const getMonthLabel = (month) => MONTH_OPTIONS.find((option) => option.value === String(month || ''))?.label || 'ทุกเดือน';

const buildYearOptions = (currentYear) => Array.from({ length: 5 }, (_, index) => String(currentYear - 2 + index));

const buildPrintRowsFromInsight = (insight) => (
  (insight?.rows || []).map((row) => (
    (insight.columns || []).map((column) => {
      const rawValue = typeof column.render === 'function' ? column.render(row) : row[column.key];
      return safeValue(rawValue);
    })
  ))
);

const Dashboard = () => {
  const currentUser = useMemo(() => JSON.parse(localStorage.getItem('user') || 'null'), []);
  const isFullAdmin = canEditAdminUsers(currentUser);
  const isManagerView = !isFullAdmin || currentUser?.role === USER_ROLES.MANAGER;
  const now = useMemo(() => new Date(), []);

  const [filters, setFilters] = useState({
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    departmentId: '',
  });
  const [stats, setStats] = useState(null);
  const [advancedStats, setAdvancedStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [insight, setInsight] = useState(null);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  const yearOptions = useMemo(() => buildYearOptions(now.getFullYear()), [now]);

  useEffect(() => {
    if (!isFullAdmin) return undefined;

    let isMounted = true;

    const fetchDepartments = async () => {
      try {
        const response = await adminAPI.getDepartments();
        if (isMounted) {
          setDepartments(response.data || []);
        }
      } catch (error) {
        console.error('Fetch departments error:', error);
      }
    };

    fetchDepartments();

    return () => {
      isMounted = false;
    };
  }, [isFullAdmin]);

  useEffect(() => {
    let isMounted = true;

    const fetchAllStats = async () => {
      setLoading(true);
      setErrorMessage('');

      const params = {
        year: filters.year,
        ...(filters.month ? { month: filters.month } : {}),
        ...(isFullAdmin && filters.departmentId ? { departmentId: filters.departmentId } : {}),
      };

      try {
        const dashboardResponse = await adminAPI.getDashboardStats(params);

        if (!isMounted) return;

        setStats(dashboardResponse.data);

        try {
          const analyticsResponse = await adminAPI.getAdvancedAnalytics(params);

          if (!isMounted) return;
          setAdvancedStats(analyticsResponse.data);
        } catch (analyticsError) {
          console.error('Fetch advanced analytics error:', analyticsError);
          if (isMounted) {
            setAdvancedStats({
              skillGap: [],
              benchmarking: [],
              roiTrend: [],
              atRisk: [],
            });
          }
        }
      } catch (error) {
        console.error('Fetch dashboard stats error:', error);
        if (isMounted) {
          setErrorMessage('ไม่สามารถโหลดข้อมูล dashboard ได้ในขณะนี้');
          setAdvancedStats({
            skillGap: [],
            benchmarking: [],
            roiTrend: [],
            atRisk: [],
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAllStats();

    return () => {
      isMounted = false;
    };
  }, [filters, isFullAdmin]);

  const selectedDepartmentName = useMemo(() => {
    if (!isFullAdmin) {
      return stats?.department || currentUser?.department || 'แผนกของคุณ';
    }

    if (!filters.departmentId) {
      return 'ทุกแผนก';
    }

    return departments.find((department) => department.id === filters.departmentId)?.name || stats?.department || 'แผนกที่เลือก';
  }, [currentUser, departments, filters.departmentId, isFullAdmin, stats?.department]);

  const periodLabel = useMemo(() => {
    const monthLabel = getMonthLabel(filters.month);
    if (!filters.month) {
      return `ปี ${filters.year}`;
    }
    return `${monthLabel} ${filters.year}`;
  }, [filters.month, filters.year]);

  const performanceRows = useMemo(() => {
    const rows = [...(stats?.learnerPerformance || [])];

    return rows.sort((left, right) => {
      if (left.status !== right.status) {
        if (left.status === 'COMPLETED') return -1;
        if (right.status === 'COMPLETED') return 1;
      }

      const leftDate = new Date(left.completedAt || left.startedAt || 0).getTime();
      const rightDate = new Date(right.completedAt || right.startedAt || 0).getTime();
      return rightDate - leftDate;
    });
  }, [stats?.learnerPerformance]);

  const completionRate = useMemo(() => {
    const total = stats?.totalEnrollments || 0;
    if (!total) return '0.0';
    return (((stats?.completedEnrollments || 0) / total) * 100).toFixed(1);
  }, [stats?.completedEnrollments, stats?.totalEnrollments]);

  const handleFilterChange = (key) => (event) => {
    const nextValue = event.target.value;
    setFilters((current) => ({
      ...current,
      [key]: nextValue,
    }));
  };

  const handlePrintDashboard = () => {
    openPrintReport({
      type: 'dashboard',
      fileName: `dashboard-performance-${filters.year}-${filters.month || 'all'}`,
      reportTitle: isManagerView
        ? `รายงานผลการเรียน ${selectedDepartmentName}`
        : 'Dashboard Performance Report',
      subtitle: isManagerView
        ? 'สรุปผลการเรียนรายบุคคลของแผนกตามช่วงเวลาที่เลือก'
        : 'สรุปภาพรวมผลการเรียนและรายละเอียดรายบุคคลตามตัวกรองที่เลือก',
      summary: [
        { label: 'ขอบเขต', value: selectedDepartmentName },
        { label: 'ผู้เรียน', value: stats?.totalUsers || 0 },
        { label: 'เรียนจบแล้ว', value: stats?.completedEnrollments || 0 },
        { label: 'Completion Rate', value: `${completionRate}%` },
        { label: 'คะแนนเฉลี่ย', value: stats?.averageQuizScore || 0 },
      ],
      filters: [
        { label: 'เดือน/ปี', value: periodLabel },
        { label: 'แผนก', value: selectedDepartmentName },
        { label: 'มุมมอง', value: isManagerView ? 'Manager' : 'Superadmin' },
      ],
      columns: ['ผู้เรียน', 'แผนก', 'คอร์ส', 'หมวดหมู่', 'สถานะ', 'คะแนน', 'เริ่มเรียน', 'จบเมื่อ'],
      rows: performanceRows.map((row) => ([
        safeValue(row.userName),
        safeValue(row.department),
        safeValue(row.courseTitle),
        safeValue(row.categoryName),
        STATUS_LABELS[row.status] || row.status,
        row.score ?? '-',
        safeValue(formatThaiDateTime(row.startedAt, true)),
        row.completedAt ? formatThaiDateTime(row.completedAt, true) : '-',
      ])),
      emptyMessage: 'ไม่มีข้อมูลผลการเรียนสำหรับตัวกรองนี้',
      dashboardData: {
        weeklyActivity: stats?.weeklyActivity || [],
        typeDistribution: stats?.typeDistribution || [],
        roiTrend: advancedStats?.roiTrend || [],
        skillGap: (advancedStats?.skillGap || []).map((item) => ({
          ...item,
          label: SKILL_LABELS[item.type] || item.type,
        })),
        performanceRows: performanceRows.map((row) => ({
          ...row,
          statusLabel: STATUS_LABELS[row.status] || row.status,
        })),
      },
    });
  };

  const handlePrintInsight = (nextInsight) => {
    openPrintReport({
      fileName: `dashboard-insight-${Date.now()}`,
      reportTitle: nextInsight.title,
      subtitle: nextInsight.subtitle,
      summary: nextInsight.summary || [],
      filters: [
        { label: 'เดือน/ปี', value: periodLabel },
        { label: 'แผนก', value: selectedDepartmentName },
      ],
      columns: (nextInsight.columns || []).map((column) => column.label),
      rows: buildPrintRowsFromInsight(nextInsight),
      emptyMessage: nextInsight.emptyMessage || 'ไม่พบข้อมูล',
    });
  };

  const openInsight = (nextInsight) => {
    setInsight(nextInsight);
  };

  const handleViewUser = async (userId) => {
    if (!userId) return;
    try {
      setShowUserDetailModal(true);
      setUserDetailLoading(true);
      const response = await adminAPI.getUserDetails(userId);
      setSelectedUserDetail(response.data);
    } catch (error) {
      console.error('Fetch user detail error:', error);
      setErrorMessage('ไม่สามารถโหลดประวัติผู้ใช้งานได้');
      setShowUserDetailModal(false);
    } finally {
      setUserDetailLoading(false);
    }
  };

  const renderUserLink = (row) => (
    <button
      type="button"
      onClick={() => handleViewUser(row.userId)}
      className="font-bold text-slate-700 transition-colors hover:text-primary hover:underline text-left"
    >
      {row.userName}
    </button>
  );

  const openWeeklyInsight = (bucket) => {
    if (!bucket) return;
    openInsight({
      title: `ผู้เริ่มเรียนช่วง ${bucket.label || bucket.date}`,
      subtitle: 'รายละเอียดผู้เรียนที่เริ่มลงเรียนในช่วงเวลานี้',
      summary: [
        { label: 'ช่วงเวลา', value: bucket.label || bucket.date },
        { label: 'ผู้เริ่มเรียน', value: bucket.count || 0 },
        { label: 'ขอบเขต', value: selectedDepartmentName },
      ],
      columns: [
        { key: 'userName', label: 'ผู้เรียน', render: renderUserLink },
        { key: 'department', label: 'แผนก' },
        { key: 'courseTitle', label: 'คอร์ส' },
        { key: 'status', label: 'สถานะ', render: (row) => STATUS_LABELS[row.status] || row.status },
        { key: 'score', label: 'คะแนน', render: (row) => row.score ?? '-' },
        { key: 'startedAt', label: 'เริ่มเรียน', render: (row) => formatThaiDateTime(row.startedAt, true) },
      ],
      rows: bucket.details || [],
      emptyMessage: 'ไม่มีผู้เริ่มเรียนในช่วงเวลานี้',
    });
  };

  const openTypeInsight = (group) => {
    if (!group) return;
    openInsight({
      title: group.name,
      subtitle: 'รายชื่อผู้เรียนที่มี enrollment อยู่ใน competency group นี้',
      summary: [
        { label: 'หมวดในกลุ่ม', value: group.value || 0 },
        { label: 'จำนวน enrollment', value: group.enrollmentCount || 0 },
        { label: 'คอร์สในกลุ่ม', value: group.courses?.length || 0 },
      ],
      columns: [
        { key: 'userName', label: 'ผู้เรียน', render: renderUserLink },
        { key: 'department', label: 'แผนก' },
        { key: 'courseTitle', label: 'คอร์ส' },
        { key: 'status', label: 'สถานะ', render: (row) => STATUS_LABELS[row.status] || row.status },
        { key: 'score', label: 'คะแนน', render: (row) => row.score ?? '-' },
        { key: 'completedAt', label: 'จบเมื่อ', render: (row) => row.completedAt ? formatThaiDateTime(row.completedAt, true) : '-' },
      ],
      rows: group.details || [],
      emptyMessage: 'ไม่พบ enrollment ใน competency group นี้',
    });
  };

  const openCategoryInsight = (category) => {
    if (!category) return;
    openInsight({
      title: `หมวดหมู่: ${category.name}`,
      subtitle: 'ผู้เรียนและคอร์สที่อยู่ภายใต้หมวดหมู่นี้',
      summary: [
        { label: 'จำนวน enrollment', value: category.value || 0 },
        { label: 'แผนก', value: selectedDepartmentName },
      ],
      columns: [
        { key: 'userName', label: 'ผู้เรียน', render: renderUserLink },
        { key: 'department', label: 'แผนก' },
        { key: 'courseTitle', label: 'คอร์ส' },
        { key: 'status', label: 'สถานะ', render: (row) => STATUS_LABELS[row.status] || row.status },
        { key: 'score', label: 'คะแนน', render: (row) => row.score ?? '-' },
      ],
      rows: category.details || [],
      emptyMessage: 'ไม่พบข้อมูลในหมวดหมู่นี้',
    });
  };

  const openCourseInsight = (course) => {
    if (!course) return;
    openInsight({
      title: `คอร์ส: ${course.title}`,
      subtitle: 'รายชื่อผู้เรียนที่ลงทะเบียนและผลลัพธ์ของคอร์สนี้',
      summary: [
        { label: 'ผู้ลงทะเบียน', value: course.students || 0 },
        { label: 'แผนก', value: selectedDepartmentName },
      ],
      columns: [
        { key: 'userName', label: 'ผู้เรียน', render: renderUserLink },
        { key: 'department', label: 'แผนก' },
        { key: 'status', label: 'สถานะ', render: (row) => STATUS_LABELS[row.status] || row.status },
        { key: 'score', label: 'คะแนน', render: (row) => row.score ?? '-' },
        { key: 'startedAt', label: 'เริ่มเรียน', render: (row) => formatThaiDateTime(row.startedAt, true) },
        { key: 'completedAt', label: 'จบเมื่อ', render: (row) => row.completedAt ? formatThaiDateTime(row.completedAt, true) : '-' },
      ],
      rows: course.details || [],
      emptyMessage: 'ยังไม่มีผู้ลงทะเบียนในคอร์สนี้',
    });
  };

  const openSkillGapInsight = (skill) => {
    if (!skill) return;
    openInsight({
      title: `Skill Gap: ${SKILL_LABELS[skill.type] || skill.type}`,
      subtitle: 'แสดงรายชื่อผู้เรียนและคะแนนสอบตาม competency area ที่เลือก',
      summary: [
        { label: 'คะแนนเฉลี่ย', value: `${Number(skill.average_mastery || 0).toFixed(1)}%` },
        { label: 'จำนวนรายการสอบ', value: skill.details?.length || 0 },
        { label: 'แผนก', value: selectedDepartmentName },
      ],
      columns: [
        { key: 'userName', label: 'ผู้เรียน', render: renderUserLink },
        { key: 'department', label: 'แผนก' },
        { key: 'courseTitle', label: 'คอร์ส' },
        { key: 'lessonTitle', label: 'แบบทดสอบ' },
        { key: 'score', label: 'คะแนน' },
        { key: 'attemptedAt', label: 'สอบล่าสุด', render: (row) => formatThaiDateTime(row.attemptedAt, true) },
      ],
      rows: skill.details || [],
      emptyMessage: 'ยังไม่มีข้อมูล skill gap ใน competency นี้',
    });
  };

  const openDepartmentInsight = (department) => {
    if (!department) return;
    openInsight({
      title: `Department: ${department.name}`,
      subtitle: 'ผลการเรียนรายบุคคลของผู้เรียนภายในแผนกนี้',
      summary: [
        { label: 'Completion Rate', value: `${Number(department.completion_rate || 0).toFixed(1)}%` },
        { label: 'จำนวนผู้เรียน', value: department.details?.length || 0 },
        { label: 'ช่วงเวลา', value: periodLabel },
      ],
      columns: [
        { key: 'userName', label: 'ผู้เรียน', render: renderUserLink },
        { key: 'email', label: 'อีเมล' },
        { key: 'completedCourses', label: 'จบแล้ว' },
        { key: 'totalCourses', label: 'ทั้งหมด' },
        { key: 'avgScore', label: 'คะแนนเฉลี่ย', render: (row) => row.avgScore ?? '-' },
      ],
      rows: department.details || [],
      emptyMessage: 'ไม่พบข้อมูลผู้เรียนในแผนกนี้',
    });
  };

  const openRoiInsight = (bucket) => {
    if (!bucket) return;
    openInsight({
      title: `ROI Trend: ${bucket.label || bucket.month}`,
      subtitle: 'รายละเอียดการเรียนจบและการได้รับคะแนนสะสมในช่วงเวลานี้',
      summary: [
        { label: 'Learning Completions', value: bucket.completions || 0 },
        { label: 'Points Distributed', value: bucket.points || 0 },
        { label: 'จำนวนรายการ', value: bucket.details?.length || 0 },
      ],
      columns: [
        { key: 'kind', label: 'ประเภท', render: (row) => row.kind === 'completion' ? 'เรียนจบ' : 'Points' },
        { key: 'userName', label: 'ผู้เรียน', render: renderUserLink },
        { key: 'department', label: 'แผนก' },
        { key: 'courseTitle', label: 'รายการ' },
        { key: 'points', label: 'แต้ม', render: (row) => row.points || 0 },
        { key: 'completedAt', label: 'เวลา', render: (row) => formatThaiDateTime(row.completedAt, true) },
      ],
      rows: bucket.details || [],
      emptyMessage: 'ยังไม่มีข้อมูล ROI ในช่วงเวลานี้',
    });
  };

  const openRiskInsight = (riskRows, singleRisk = null) => {
    const rows = Array.isArray(riskRows) ? riskRows : singleRisk ? [singleRisk] : [];
    if (!rows.length) return;

    openInsight({
      title: singleRisk ? `Risk: ${singleRisk.userName}` : 'ผู้เรียนที่เสี่ยงไม่บรรลุเป้าหมาย',
      subtitle: 'ผู้เรียนที่ทำคะแนนหรือจำนวนคอร์สไม่ครบตามเป้าหมาย (Goal) ที่ใกล้หมดอายุ',
      summary: [
        { label: 'จำนวนรายการ', value: rows.length },
        { label: 'แผนก', value: selectedDepartmentName },
      ],
      columns: [
        { key: 'userName', label: 'ผู้เรียน', render: renderUserLink },
        { key: 'department', label: 'แผนก' },
        { key: 'courseTitle', label: 'เป้าหมาย (Goal)' },
        { key: 'gapCount', label: 'ขาดอีก (รายการ)', render: (row) => row.gapCount > 0 ? `${row.gapCount} คอร์ส` : '-' },
        { key: 'deadline', label: 'วันหมดอายุเป้าหมาย', render: (row) => formatThaiDateTime(row.deadline, true) },
        { key: 'isOverdue', label: 'สถานะ', render: (row) => row.isOverdue ? 'เลยกำหนด' : 'ใกล้หมดเวลา' },
      ],
      rows,
      emptyMessage: 'ไม่พบผู้เรียนที่เสี่ยงในช่วงเวลานี้',
    });
  };

  const managerSubtitle = `${selectedDepartmentName} • โฟกัสเฉพาะผลการเรียนรายบุคคล คะแนนสอบ และความเสี่ยงในการเรียนไม่จบ`;
  const adminSubtitle = 'ดูทั้งภาพรวมองค์กรและ drill-down ลงไปถึงรายชื่อผู้เรียนของแต่ละกราฟได้ทันที';

  if (loading && !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10 animate-fade-in">
      <AdminPageHeader
        title={isManagerView ? `Performance Dashboard • ${selectedDepartmentName}` : 'KM & Performance Dashboard'}
        subtitle={isManagerView ? managerSubtitle : adminSubtitle}
        actions={(
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
            <div className="flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <SlidersHorizontal size={16} />
                <span>Filter</span>
              </div>

              <select
                value={filters.month}
                onChange={handleFilterChange('month')}
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary/40"
              >
                {MONTH_OPTIONS.map((month) => (
                  <option key={month.value || 'all'} value={month.value}>{month.label}</option>
                ))}
              </select>

              <select
                value={filters.year}
                onChange={handleFilterChange('year')}
                className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary/40"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              {isFullAdmin ? (
                <div className="relative">
                  <Building2 size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={filters.departmentId}
                    onChange={handleFilterChange('departmentId')}
                    className="min-h-11 rounded-2xl border border-slate-200 bg-white py-0 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary/40"
                  >
                    <option value="">ทุกแผนก</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>{department.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handlePrintDashboard}
              className="btn btn-primary gap-2 shadow-lg shadow-primary/20"
            >
              <FileDown size={16} />
              <span>Print to PDF</span>
            </button>
          </div>
        )}
      />

      {errorMessage ? (
        <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <StatCards stats={stats} isFullAdmin={isFullAdmin} />

      {isManagerView ? (
        <>
          <div className="grid grid-cols-1 gap-6">
            <RiskIdentificationWidget
              data={advancedStats?.atRisk}
              onSelectRisk={(risk) => openRiskInsight(null, risk)}
              onViewAll={(rows) => openRiskInsight(rows)}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SkillGapRadarChart
              data={advancedStats?.skillGap}
              onSelectSkillGap={openSkillGapInsight}
            />
            <WeeklyActivityChart
              data={stats?.weeklyActivity}
              onSelectBucket={openWeeklyInsight}
            />
          </div>

          <IncentiveROITrend
            data={advancedStats?.roiTrend}
            onSelectBucket={openRoiInsight}
          />
        </>
      ) : (
        <>
          <section className="mt-2 text-slate-800">
            <div className="mb-4 flex items-center gap-2 px-2">
              <div className="h-6 w-1 rounded-full bg-primary" />
              <h2 className="text-xl font-black tracking-tight">Strategic Insights</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SkillGapRadarChart
                data={advancedStats?.skillGap}
                onSelectSkillGap={openSkillGapInsight}
              />
              <IncentiveROITrend
                data={advancedStats?.roiTrend}
                onSelectBucket={openRoiInsight}
              />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DepartmentLeaderboard
                data={advancedStats?.benchmarking}
                onSelectDepartment={openDepartmentInsight}
              />
            </div>
            <div className="lg:col-span-1">
              <RiskIdentificationWidget
                data={advancedStats?.atRisk}
                onSelectRisk={(risk) => openRiskInsight(null, risk)}
                onViewAll={(rows) => openRiskInsight(rows)}
              />
            </div>
          </div>

          <div className="my-2 h-px bg-slate-100" />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <WeeklyActivityChart
              data={stats?.weeklyActivity}
              onSelectBucket={openWeeklyInsight}
            />

            <MajorGroupChart
              data={stats?.typeDistribution}
              onSelectGroup={openTypeInsight}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <CategoryDistributionChart
              data={stats?.categoryDistribution}
              totalCourses={stats?.activeCourses}
              onSelectCategory={openCategoryInsight}
            />

            <PopularCoursesTable
              courses={stats?.popularCourses}
              onSelectCourse={openCourseInsight}
            />
          </div>


        </>
      )}

      {loading ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-500">
          กำลังอัปเดตข้อมูล dashboard ตามตัวกรองล่าสุด...
        </div>
      ) : null}

      <DashboardInsightModal
        insight={insight}
        onClose={() => setInsight(null)}
        onPrint={handlePrintInsight}
      />

      <UserDetailModal
        isOpen={showUserDetailModal}
        loading={userDetailLoading}
        detail={selectedUserDetail}
        onClose={() => {
          setShowUserDetailModal(false);
          setSelectedUserDetail(null);
        }}
      />
    </div>
  );
};

export default Dashboard;
