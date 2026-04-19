import React, { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../utils/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { canEditAdminUsers } from '../../utils/roles';

// Sub-components
import StatCards from '../../components/admin/StatCards';
import WeeklyActivityChart from '../../components/admin/WeeklyActivityChart';
import MajorGroupChart from '../../components/admin/MajorGroupChart';
import CategoryDistributionChart from '../../components/admin/CategoryDistributionChart';
import PopularCoursesTable from '../../components/admin/PopularCoursesTable';
import GroupDetailModal from '../../components/admin/GroupDetailModal';

// Strategic Components
import SkillGapRadarChart from '../../components/admin/SkillGapRadarChart';
import DepartmentLeaderboard from '../../components/admin/DepartmentLeaderboard';
import IncentiveROITrend from '../../components/admin/IncentiveROITrend';
import RiskIdentificationWidget from '../../components/admin/RiskIdentificationWidget';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [advancedStats, setAdvancedStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const currentUser = useMemo(() => JSON.parse(localStorage.getItem('user') || 'null'), []);
  const isFullAdmin = canEditAdminUsers(currentUser);

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        const [dashRes, advRes] = await Promise.all([
          adminAPI.getDashboardStats(),
          adminAPI.getAdvancedAnalytics()
        ]);
        setStats(dashRes.data);
        setAdvancedStats(advRes.data);
      } catch (error) {
        console.error('Fetch dashboard stats error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10">
      <AdminPageHeader
        title={isFullAdmin ? 'KM & Performance Dashboard' : `แดชบอร์ดแผนก ${stats?.department || currentUser?.department || ''}`}
        subtitle={isFullAdmin
          ? 'วิเคราะห์ขีดความสามารถ (Skill Gap) และผลลัพธ์การเรียนรู้เชิงกลยุทธ์'
          : 'ภาพรวมการเรียนและการวิเคราะห์ทักษะในแผนกที่คุณดูแล'}
        actions={isFullAdmin ? (
          <button type="button" className="btn btn-primary shadow-lg shadow-primary/20">
            ออกรายงาน KM Strategy
          </button>
        ) : null}
      />

      <StatCards 
        stats={stats} 
        isFullAdmin={isFullAdmin} 
      />

      {/* STRATEGIC ANALYTICS LAYER */}
      <section className="mt-2 text-slate-800">
        <div className="flex items-center gap-2 mb-4 px-2">
          <div className="w-1 h-6 bg-primary rounded-full" />
          <h2 className="text-xl font-black uppercase tracking-tight">Strategic Insights</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkillGapRadarChart 
            data={advancedStats?.skillGap} 
          />
          <IncentiveROITrend 
            data={advancedStats?.roiTrend} 
          />
        </div>
      </section>

      {/* PERFORMANCE & RISK LAYER */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DepartmentLeaderboard 
            data={advancedStats?.benchmarking} 
          />
        </div>
        <div className="lg:col-span-1">
          <RiskIdentificationWidget 
            data={advancedStats?.atRisk} 
          />
        </div>
      </div>

      <div className="h-px bg-slate-100 my-4" />

      {/* OPERATIONAL ANALYTICS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WeeklyActivityChart 
          data={stats?.weeklyActivity} 
        />

        <MajorGroupChart 
          data={stats?.typeDistribution}
          onSelectGroup={setSelectedGroup}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <CategoryDistributionChart 
          data={stats?.categoryDistribution}
          totalCourses={stats?.activeCourses}
        />

        <PopularCoursesTable 
          courses={stats?.popularCourses}
        />
      </div>

      <GroupDetailModal 
        selectedGroup={selectedGroup}
        onClose={() => setSelectedGroup(null)}
      />
    </div>
  );
};

export default Dashboard;
