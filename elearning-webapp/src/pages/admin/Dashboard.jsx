import React from 'react';
import { FileDown, SlidersHorizontal } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { canEditAdminUsers } from '../../utils/roles';
import { USER_ROLES } from '../../utils/constants/roles';
import { MONTH_OPTIONS, SKILL_LABELS, ENROLLMENT_STATUS_LABELS } from '../../utils/constants/dashboard';
import { formatThaiDateTime, getThailandDateParts } from '../../utils/dateUtils';
import { openPrintReport } from '../../utils/printUtils';
import { FILTER_VALUES } from '../../utils/constants/filters';
import useDashboardData from '../../hooks/useDashboardData';

import StatCards from '../../components/admin/StatCards';
import WeeklyActivityChart from '../../components/admin/WeeklyActivityChart';
import MajorGroupChart from '../../components/admin/MajorGroupChart';
import CategoryDistributionChart from '../../components/admin/CategoryDistributionChart';
import PopularCoursesTable from '../../components/admin/PopularCoursesTable';
import SkillGapRadarChart from '../../components/admin/SkillGapRadarChart';
import DepartmentLeaderboard from '../../components/admin/DepartmentLeaderboard';
import RiskIdentificationWidget from '../../components/admin/RiskIdentificationWidget';
import GoalTrackingWidget from '../../components/admin/GoalTrackingWidget';
import DashboardInsightModal from '../../components/admin/DashboardInsightModal';
import UserDetailModal from '../../components/admin/UserDetailModal';
import UserLink from '../../components/admin/UserLink';
import CustomSelect from '../../components/common/CustomSelect';
import * as InsightConfigs from './InsightConfigs';
import GoalReportModal from '../../components/admin/GoalReportModal';
import Skeleton from '../../components/common/Skeleton';





const safeValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object' && !Array.isArray(value)) {
    if (value.props && value.props.children) {
      return safeValue(value.props.children);
    }
    return value.name || value.title || value.label || String(value);
  }
  return String(value);
};

const getMonthLabel = (month) => MONTH_OPTIONS.find((option) => option.value === String(month || ''))?.label || 'ทุกเดือน';

const buildYearOptions = (currentYear) => Array.from({ length: 5 }, (_, index) => String(currentYear - 2 + index));

const buildPrintRowsFromInsight = (insight) => (
  (insight?.rows || []).map((row) => (
    (insight.columns || []).map((column) => {
      const renderedValue = typeof column.render === 'function' ? column.render(row) : row[column.key];
      if (renderedValue && typeof renderedValue === 'object' && !Array.isArray(renderedValue)) {
        const rawValue = row[column.key];
        if (rawValue && typeof rawValue !== 'object') {
          return safeValue(rawValue);
        }
        return safeValue(renderedValue);
      }
      return safeValue(renderedValue);
    })
  ))
);

const Dashboard = () => {
  const currentUser = React.useMemo(() => JSON.parse(localStorage.getItem('user') || 'null'), []);
  const currentUserDepartment = currentUser?.department || '';
  const isFullAdmin = canEditAdminUsers(currentUser);
  const isManagerView = !isFullAdmin || currentUser?.role === USER_ROLES.MANAGER;
  const thaiNow = React.useMemo(() => getThailandDateParts(new Date()), []);

  const [filters, setFilters] = React.useState({
    month: String(thaiNow?.month || 1),
    year: String(thaiNow?.year || new Date().getFullYear()),
    departmentId: '',
  });
  const [stats, setStats] = React.useState(null);
  const [advancedStats, setAdvancedStats] = React.useState(null);
  const [departments, setDepartments] = React.useState([]);
  const [insight, setInsight] = React.useState(null);
  const [showUserDetailModal, setShowUserDetailModal] = React.useState(false);
  const [userDetailLoading, setUserDetailLoading] = React.useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = React.useState(null);
  const [reportGoal, setReportGoal] = React.useState(null);
  const [reportData, setReportData] = React.useState(null);
  const [reportLoading, setReportLoading] = React.useState(false);
  const [reportInitialFilterStatus, setReportInitialFilterStatus] = React.useState('ALL');

  const yearOptions = React.useMemo(() => buildYearOptions(thaiNow?.year || new Date().getFullYear()), [thaiNow]);

  const selectedDepartmentName = React.useMemo(() => {
    if (!isFullAdmin) {
      return stats?.department || currentUser?.department || 'แผนกของคุณ';
    }
    if (!filters.departmentId) {
      return 'ทุกแผนก';
    }
    return departments.find((department) => department.id === filters.departmentId)?.name || stats?.department || 'แผนกที่เลือก';
  }, [currentUser, departments, filters.departmentId, isFullAdmin, stats?.department]);

  const periodLabel = React.useMemo(() => {
    const monthLabel = getMonthLabel(filters.month);
    if (!filters.month) {
      return `ปี ${filters.year}`;
    }
    return `${monthLabel} ${filters.year}`;
  }, [filters.month, filters.year]);

  const {
    loading,
    errorMessage,
    setErrorMessage,
    goalTrackingItems,
    goalTrackingLoading,
  } = useDashboardData({
    filters,
    isFullAdmin,
    currentUserDepartment,
    selectedDepartmentName,
    setStats,
    setAdvancedStats,
    setDepartments,
  });

  const performanceRows = React.useMemo(() => {
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
        { label: 'ผู้เรียนทั้งหมด', value: stats?.totalUsers || 0 },
        { label: 'เรียนสำเร็จแล้ว', value: `${stats?.completedEnrollments || 0} จาก ${stats?.totalEnrollments || 0} enrollment` },
        { label: 'Compliance Rate', value: `${stats?.complianceRate || '0.0'}%` },
        { label: 'คะแนนเฉลี่ย', value: stats?.averageQuizScore || 0 },
      ],
      filters: [
        { label: 'เดือน/ปี', value: periodLabel },
        { label: 'แผนก', value: selectedDepartmentName },
        { label: 'มุมมอง', value: isManagerView ? 'Manager' : 'Superadmin' },
      ],
      columns: ['ผู้เรียน', 'แผนก', 'คอร์ส', 'หมวดหมู่', 'สถานะ', 'คะแนน', 'เริ่มเรียน', 'สำเร็จเมื่อ'],
      rows: performanceRows.map((row) => ([
        safeValue(row.userName),
        safeValue(row.department),
        safeValue(row.courseTitle),
        safeValue(row.categoryName),
        ENROLLMENT_STATUS_LABELS[row.status] || row.status,
        row.score ?? '-',
        safeValue(formatThaiDateTime(row.startedAt, true)),
        row.completedAt ? formatThaiDateTime(row.completedAt, true) : '-',
      ])),
      emptyMessage: 'ไม่มีข้อมูลผลการเรียนสำหรับตัวกรองนี้',
      dashboardData: {
        weeklyActivity: stats?.weeklyActivity || [],
        typeDistribution: stats?.typeDistribution || [],
        skillGap: (advancedStats?.skillGap || []).map((item) => ({
          ...item,
          label: SKILL_LABELS[item.type] || item.type,
        })),
        performanceRows: performanceRows.map((row) => ({
          ...row,
          statusLabel: ENROLLMENT_STATUS_LABELS[row.status] || row.status,
        })),
        goals: goalTrackingItems.map(goal => ({
          title: goal.title,
          scopeLabel: goal.scopeLabel,
          targetLabel: goal.targetLabel,
          expiryDate: goal.expiryDate,
          counts: goal.counts
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
    <UserLink
      userId={row.userId}
      userName={row.userName}
      onViewUser={handleViewUser}
    />
  );

  const openGoalReportModal = (goal, nextReportData, initialStatus = 'ALL') => {
    setReportGoal(goal);
    setReportData(nextReportData);
    setReportInitialFilterStatus(initialStatus);
    setReportLoading(false);
  };

  const handleOpenTrackedGoalReport = (goal, initialStatus = 'ALL') => {
    if (!goal) return;
    handleViewGoalReport(goal, initialStatus);
  };

  const handleViewGoalReport = async (goal, initialStatus = 'ALL') => {
    if (!goal || !goal.id) return;
    try {
      setReportGoal(goal);
      setReportLoading(true);
      setReportInitialFilterStatus(initialStatus);
      const response = await adminAPI.getGoalReport(goal.id);
      const allRows = response.data?.report || [];
      const visibleRows = (isFullAdmin && filters.departmentId && selectedDepartmentName)
        ? allRows.filter((row) => row.department === selectedDepartmentName)
        : (!isFullAdmin && currentUserDepartment)
          ? allRows.filter((row) => row.department === currentUserDepartment)
          : allRows;

      openGoalReportModal(goal, {
        ...response.data,
        report: visibleRows,
      }, initialStatus);
    } catch (error) {
      console.error('Fetch goal report error:', error);
      setErrorMessage('ไม่สามารถโหลดรายงานเป้าหมายได้');
      setReportGoal(null);
      setReportData(null);
    } finally {
      setReportLoading(false);
    }
  };

  const renderGoalLink = (row) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleViewGoalReport({ id: row.goalId || row.courseId, title: row.goalTitle || row.courseTitle });
      }}
      className="inline-block text-left font-bold text-primary hover:text-primary-dark hover:underline transition-all cursor-pointer relative z-[5]"
    >
      {row.goalTitle || row.courseTitle}
    </button>
  );

  const openWeeklyInsight = (bucket) => {
    if (!bucket) return;
    setInsight(InsightConfigs.getWeeklyInsightConfig(bucket, selectedDepartmentName, renderUserLink));
  };

  const openTypeInsight = (group) => {
    if (!group) return;
    setInsight(InsightConfigs.getTypeInsightConfig(group, renderUserLink));
  };

  const openCategoryInsight = (category) => {
    if (!category) return;
    setInsight(InsightConfigs.getCategoryInsightConfig(category, selectedDepartmentName, renderUserLink));
  };

  const openCourseInsight = (course) => {
    if (!course) return;
    setInsight(InsightConfigs.getCourseInsightConfig(course, selectedDepartmentName, renderUserLink));
  };

  const openSkillGapInsight = (skill) => {
    if (!skill) return;
    setInsight(InsightConfigs.getSkillGapInsightConfig(skill, selectedDepartmentName, renderUserLink));
  };

  const openDepartmentInsight = (department) => {
    if (!department) return;
    setInsight(InsightConfigs.getDepartmentInsightConfig(department, periodLabel, renderUserLink));
  };

  const openRiskInsight = (riskRows, singleRisk = null) => {
    const rows = Array.isArray(riskRows) ? riskRows : singleRisk ? [singleRisk] : [];
    if (!rows.length) return;
    setInsight(InsightConfigs.getRiskInsightConfig(rows, selectedDepartmentName, renderUserLink, renderGoalLink, singleRisk));
  };

  const managerSubtitle = `${selectedDepartmentName} • โฟกัสเฉพาะผลการเรียนรายบุคคล คะแนนสอบ และความเสี่ยงในการเรียนไม่จบ`;
  const adminSubtitle = 'ดูทั้งภาพรวมองค์กรและ drill-down ลงไปถึงรายชื่อผู้เรียนของแต่ละกราฟได้ทันที';

  if (loading && !stats) {
    return <Skeleton.Dashboard />;
  }

  return (
    <div className="flex flex-col gap-6 pb-10 animate-fade-in">
      <AdminPageHeader
        title={isManagerView ? `Performance Dashboard • ${selectedDepartmentName}` : 'KM & Performance Dashboard'}
        subtitle={isManagerView ? managerSubtitle : adminSubtitle}
        actions={(
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
            <div className="flex flex-wrap items-center gap-2 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-600">
                <SlidersHorizontal size={16} />
                <span>Filter</span>
              </div>

              <CustomSelect
                value={filters.month}
                onChange={handleFilterChange('month')}
                size="sm"
                fullWidth={false}
                className="w-32"
                options={MONTH_OPTIONS}
              />

              <CustomSelect
                value={filters.year}
                onChange={handleFilterChange('year')}
                size="sm"
                fullWidth={false}
                className="w-24"
                options={yearOptions.map((year) => ({ value: year, label: year }))}
              />

              {isFullAdmin ? (
                <CustomSelect
                  value={filters.departmentId}
                  onChange={handleFilterChange('departmentId')}
                  size="sm"
                  fullWidth={false}
                  className="w-40 lg:w-44"
                  placeholder="ทุกแผนก"
                  options={[
                    { value: '', label: 'ทุกแผนก' },
                    ...departments.map((d) => ({ value: d.id, label: d.name }))
                  ]}
                />
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

      <div className={isManagerView ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 gap-6 xl:grid-cols-2"}>
        <MajorGroupChart
          data={stats?.typeDistribution}
          onSelectGroup={openTypeInsight}
        />
        {!isManagerView && (
          <DepartmentLeaderboard
            data={advancedStats?.benchmarking}
            onSelectDepartment={openDepartmentInsight}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <CategoryDistributionChart
          data={stats?.categoryDistribution}
          totalCourses={stats?.activeCourses}
          onSelectCategory={openCategoryInsight}
        />
      </div>

      <GoalTrackingWidget
        goals={goalTrackingItems}
        loading={goalTrackingLoading}
        selectedDepartmentName={selectedDepartmentName}
        onOpenGoalReport={handleOpenTrackedGoalReport}
      />

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
              <RiskIdentificationWidget
                data={advancedStats?.atRisk}
                onSelectRisk={(risk) => openRiskInsight(null, risk)}
                onViewAll={(rows) => openRiskInsight(rows)}
              />
            </div>
          </section>



          <div className="my-2 h-px bg-slate-100" />

          <div className="grid grid-cols-1 gap-6">
            <WeeklyActivityChart
              data={stats?.weeklyActivity}
              onSelectBucket={openWeeklyInsight}
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
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

      <GoalReportModal
        reportGoal={reportGoal}
        reportData={reportData}
        reportLoading={reportLoading}
        initialFilterStatus={reportInitialFilterStatus}
        onClose={() => {
          setReportGoal(null);
          setReportData(null);
          setReportInitialFilterStatus('ALL');
        }}
      />
    </div>
  );
};

export default Dashboard;
