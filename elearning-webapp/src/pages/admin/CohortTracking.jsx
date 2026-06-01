import React from 'react';
import { Activity, BookOpenCheck, CheckCircle2, Search, Users } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import UserDetailModal from '../../components/admin/UserDetailModal';
import { useToast } from '../../context/useToast';

const formatDate = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
};

const CohortTracking = () => {
  const toast = useToast();
  const [trackingData, setTrackingData] = React.useState(null);
  const [cohortRoles, setCohortRoles] = React.useState([]);
  const [selectedRoleId, setSelectedRoleId] = React.useState('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = React.useState(null);
  const [showDetailModal, setShowDetailModal] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [trackingRes, rolesRes] = await Promise.all([
        adminAPI.getSupervisorTracking(),
        adminAPI.getCohortRoles()
      ]);
      setTrackingData(trackingRes.data || { groups: [] });
      setCohortRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
    } catch (error) {
      console.error('Fetch cohort tracking error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถโหลดข้อมูล Cohort Tracking ได้');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groups = React.useMemo(() => trackingData?.groups || [], [trackingData]);
  const totals = React.useMemo(() => groups.reduce((acc, group) => ({
    roleCount: acc.roleCount + 1,
    userCount: acc.userCount + (group.summary?.userCount || 0),
    completedCourses: acc.completedCourses + (group.summary?.completedCourses || 0),
    totalCourses: acc.totalCourses + (group.summary?.totalCourses || 0)
  }), { roleCount: 0, userCount: 0, completedCourses: 0, totalCourses: 0 }), [groups]);

  const filteredGroups = React.useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return groups
      .filter((group) => selectedRoleId === 'all' || group.cohortRole?.id === selectedRoleId)
      .map((group) => ({
        ...group,
        users: (group.users || []).filter((user) => {
          if (!keyword) return true;
          return `${user.name || ''} ${user.email || ''} ${user.department || ''}`.toLowerCase().includes(keyword);
        })
      }))
      .filter((group) => group.users.length > 0 || !keyword);
  }, [groups, searchTerm, selectedRoleId]);

  const handleViewUser = async (userId) => {
    try {
      setShowDetailModal(true);
      setDetailLoading(true);
      const response = await adminAPI.getUserDetails(userId);
      setSelectedUserDetail(response.data);
    } catch (error) {
      console.error('Fetch user detail error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถโหลดประวัติผู้เรียนได้');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const completionRate = totals.totalCourses > 0
    ? Math.round((totals.completedCourses / totals.totalCourses) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Cohort Role Tracking"
        subtitle="ติดตามประวัติการเรียนของผู้เรียนตามกลุ่มที่คุณดูแล"
      />

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Groups</span>
            <Users size={18} className="text-primary" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{totals.roleCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Learners</span>
            <Activity size={18} className="text-sky-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{totals.userCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Completed</span>
            <BookOpenCheck size={18} className="text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{totals.completedCourses}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Rate</span>
            <CheckCircle2 size={18} className="text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{completionRate}%</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="ค้นหาชื่อ อีเมล หรือแผนก..."
            className="form-input w-full bg-slate-50 py-3 pl-10 pr-4 text-sm"
          />
        </div>
        <select
          value={selectedRoleId}
          onChange={(event) => setSelectedRoleId(event.target.value)}
          className="form-input min-h-[46px] bg-slate-50 px-4 text-sm font-bold lg:w-72"
        >
          <option value="all">ทุก Cohort Role</option>
          {groups.map((group) => (
            <option key={group.cohortRole?.id} value={group.cohortRole?.id}>
              {group.cohortRole?.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="text-base font-black text-slate-800">ยังไม่มีกลุ่มที่ต้องดูแล</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">ตั้งผู้ดูแลประจำ Role ได้จากเมนูจัดการ Role</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredGroups.map((group) => (
            <section key={group.cohortRole?.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{group.cohortRole?.name || 'Cohort Role'}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {group.summary?.userCount || 0} คน · สำเร็จ {group.summary?.completionRate || 0}%
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(group.supervisors || []).map((supervisor) => (
                    <span key={supervisor.id} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                      {supervisor.name || supervisor.email}
                    </span>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-white">
                    <tr className="text-xs font-black uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3">ผู้เรียน</th>
                      <th className="px-5 py-3">Level</th>
                      <th className="px-5 py-3">คอร์ส</th>
                      <th className="px-5 py-3">ความคืบหน้า</th>
                      <th className="px-5 py-3">ล่าสุด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(group.users || []).map((user) => {
                      const level = user.roleLevels?.[group.cohortRole?.key] || '-';
                      return (
                        <tr key={user.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => handleViewUser(user.id)}
                              className="text-left"
                            >
                              <span className="block text-sm font-black text-slate-900 hover:text-primary">{user.name || user.email}</span>
                              <span className="mt-0.5 block text-xs font-semibold text-slate-400">{user.email} · {user.department || '-'}</span>
                            </button>
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-600">{level}</td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-600">
                            {user.tracking.completedCourses}/{user.tracking.totalCourses}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex min-w-40 items-center gap-3">
                              <div className="h-2 flex-1 rounded-full bg-slate-100">
                                <div
                                  className="h-2 rounded-full bg-primary"
                                  style={{ width: `${Math.min(user.tracking.averageProgress || 0, 100)}%` }}
                                />
                              </div>
                              <span className="w-10 text-right text-xs font-black text-slate-500">
                                {user.tracking.averageProgress || 0}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-500">
                            <span className="block max-w-64 truncate font-bold text-slate-700">{user.tracking.latestCourseTitle || '-'}</span>
                            <span className="text-xs text-slate-400">{formatDate(user.tracking.latestLearningAt)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      <UserDetailModal
        isOpen={showDetailModal}
        loading={detailLoading}
        detail={selectedUserDetail}
        cohortRoles={cohortRoles}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedUserDetail(null);
        }}
      />
    </div>
  );
};

export default CohortTracking;
