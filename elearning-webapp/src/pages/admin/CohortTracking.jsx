import React from 'react';
import { Activity, BookOpenCheck, CheckCircle2, Search, Users, ChevronDown, Check, Download } from 'lucide-react';
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

const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'เลือกรายการ...',
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const clickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const selectedOpt = React.useMemo(() => options.find(opt => opt.value === value), [options, value]);

  React.useEffect(() => {
    if (!isOpen) {
      setSearch(selectedOpt ? selectedOpt.label : '');
    }
  }, [isOpen, selectedOpt]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!isOpen) return options;
    if (!q) return options;
    return options.filter(opt => opt.label.toLowerCase().includes(q));
  }, [options, search, isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          required={required && !value}
          placeholder={placeholder}
          value={search}
          onFocus={() => {
            setIsOpen(true);
            setSearch('');
          }}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          className="form-input w-full bg-slate-50 font-bold h-[46px] text-sm pr-10 focus:bg-white focus:ring-0 focus:border-slate-300"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-slate-400">
          <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-xs font-bold text-slate-400 text-center uppercase tracking-wider">
              ไม่พบข้อมูล
            </div>
          ) : (
            filtered.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setSearch(opt.label);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold transition-all ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={14} className="text-indigo-600 shrink-0 ml-2" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
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
    userCount: acc.userCount + (group.summary?.userCount || 0)
  }), { roleCount: 0, userCount: 0 }), [groups]);

  const cohortRoleOptions = React.useMemo(() => {
    const list = [{ value: 'all', label: 'ทุก Cohort Role' }];
    groups.forEach((group) => {
      if (group.cohortRole?.id) {
        list.push({
          value: group.cohortRole.id,
          label: group.cohortRole.name || 'Cohort Role'
        });
      }
    });
    return list;
  }, [groups]);

  const filteredGroups = React.useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return groups
      .filter((group) => selectedRoleId === 'all' || group.cohortRole?.id === selectedRoleId)
      .map((group) => ({
        ...group,
        users: (group.users || []).filter((user) => {
          if (!keyword) return true;
          return `${user.name || ''} ${user.email || ''} ${user.department || ''} ${user.subdivision || ''} ${user.position || ''}`.toLowerCase().includes(keyword);
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

  const handleExportExcel = () => {
    try {
      toast.info('กำลังสร้างไฟล์รายงาน...');

      const headers = [
        'Cohort Role',
        'ผู้เรียน',
        'อีเมล',
        'กอง',
        'กลุ่มงาน (Sub-division)',
        'ตำแหน่ง',
        'ระดับตำแหน่ง',
        'เป้าหมายสำเร็จ',
        'เป้าหมายทั้งหมด',
        'ความคืบหน้าเฉลี่ย',
        'ล่าสุด',
        'วันที่เรียนล่าสุด'
      ];

      const rows = [];
      filteredGroups.forEach((group) => {
        const groupName = group.cohortRole?.name || 'Cohort Role';
        (group.users || []).forEach((user) => {
          rows.push([
            groupName,
            user.name || user.email,
            user.email,
            user.department || '-',
            user.subdivision || '-',
            user.position || '-',
            user.positionLevel || '-',
            user.tracking.completedGoals,
            user.tracking.totalGoals,
            `${user.tracking.averageProgress || 0}%`,
            user.tracking.latestCourseTitle || '-',
            formatDate(user.tracking.latestLearningAt)
          ]);
        });
      });

      if (rows.length === 0) {
        toast.error('ไม่มีข้อมูลที่จะส่งออก');
        return;
      }

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => {
          let cleanVal = String(val === null || val === undefined ? '' : val).replace(/"/g, '""');
          if (cleanVal.includes(',') || cleanVal.includes('\n') || cleanVal.includes('"')) {
            cleanVal = `"${cleanVal}"`;
          }
          return cleanVal;
        }).join(','))
      ].join('\r\n');

      // UTF-8 BOM to support Thai in Excel
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cohort_tracking_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('ดาวน์โหลดรายงานสำเร็จ');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('ไม่สามารถส่งออกข้อมูลได้');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Cohort Role Tracking"
        subtitle="ติดตามประวัติการเรียนของผู้เรียนตามกลุ่มที่คุณดูแล"
      />

      <div className="grid gap-3 md:grid-cols-2">
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
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="ค้นหาชื่อ อีเมล หรือกอง..."
            className="form-input w-full bg-slate-50 py-3 pl-10 pr-4 text-sm"
          />
        </div>
        <div className="w-full lg:w-72 flex gap-3">
          <div className="flex-1">
            <SearchableSelect
              options={cohortRoleOptions}
              value={selectedRoleId}
              onChange={setSelectedRoleId}
              placeholder="ค้นหาหรือเลือก Cohort Role..."
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportExcel}
          className="flex h-[46px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white hover:bg-emerald-700 transition-colors shrink-0"
        >
          <Download size={16} />
          ส่งออก Excel
        </button>
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
                      <th className="px-5 py-3">กอง</th>
                      <th className="px-5 py-3">กลุ่มงาน (Sub-division)</th>
                      <th className="px-5 py-3">ตำแหน่ง</th>
                      <th className="px-5 py-3">ระดับตำแหน่ง</th>
                      <th className="px-5 py-3">เป้าหมาย</th>
                      <th className="px-5 py-3">ความคืบหน้า</th>
                      <th className="px-5 py-3">ล่าสุด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(group.users || []).map((user) => {
                      return (
                        <tr key={user.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => handleViewUser(user.id)}
                              className="text-left"
                            >
                              <span className="block text-sm font-black text-slate-900 hover:text-primary">{user.name || user.email}</span>
                              <span className="mt-0.5 block text-xs font-semibold text-slate-400">{user.email}</span>
                            </button>
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-600 max-w-[150px] truncate" title={user.department}>
                            {user.department || '-'}
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-600 max-w-[150px] truncate" title={user.subdivision}>
                            {user.subdivision || '-'}
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-600 max-w-[150px] truncate" title={user.position}>
                            {user.position || '-'}
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-600 whitespace-nowrap">
                            {user.positionLevel || '-'}
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-600">
                            {user.tracking.completedGoals}/{user.tracking.totalGoals}
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
