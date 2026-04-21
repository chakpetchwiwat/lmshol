import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Settings2, Sparkles, Users, CircleCheckBig, Clock3, TriangleAlert } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import UserModal from '../../components/admin/UserModal';
import ReferenceDataModal from '../../components/admin/ReferenceDataModal';
import InstructorPresetModal from '../../components/admin/InstructorPresetModal';
import UserDetailModal from '../../components/admin/UserDetailModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { canEditAdminUsers } from '../../utils/roles';
import { useToast } from '../../context/useToast';
import useConfirm from '../../hooks/useConfirm';
import { USER_ROLES } from '../../utils/constants/roles';
import { FILTER_VALUES } from '../../utils/constants/filters';
import { ENROLLMENT_STATUS } from '../../utils/constants/statuses';
import UserFilters from '../../components/admin/UserFilters';
import UserList from '../../components/admin/UserList';

const STATUS_SORT_ORDER = {
  [ENROLLMENT_STATUS.NOT_STARTED]: 0,
  [ENROLLMENT_STATUS.IN_PROGRESS]: 1,
  [ENROLLMENT_STATUS.COMPLETED]: 2,
};

const TRACKING_SUMMARY_CONFIG = [
  {
    key: ENROLLMENT_STATUS.COMPLETED,
    label: 'เรียนจบแล้ว',
    description: 'พร้อมใช้งานตามแผน',
    icon: CircleCheckBig,
    cardClassName: 'border-emerald-100 bg-emerald-50/80',
    iconClassName: 'bg-emerald-100 text-emerald-700',
    valueClassName: 'text-emerald-700',
  },
  {
    key: ENROLLMENT_STATUS.IN_PROGRESS,
    label: 'กำลังเรียน',
    description: 'อยู่ระหว่างเก็บความคืบหน้า',
    icon: Clock3,
    cardClassName: 'border-amber-100 bg-amber-50/80',
    iconClassName: 'bg-amber-100 text-amber-700',
    valueClassName: 'text-amber-700',
  },
  {
    key: ENROLLMENT_STATUS.NOT_STARTED,
    label: 'ยังไม่เริ่มเรียน',
    description: 'เป็นกลุ่มที่ควร follow up ก่อน',
    icon: TriangleAlert,
    cardClassName: 'border-rose-100 bg-rose-50/80',
    iconClassName: 'bg-rose-100 text-rose-700',
    valueClassName: 'text-rose-700',
  },
];

const TRACKING_COLUMNS = [
  { label: 'พนักงาน' },
  { label: 'ตำแหน่ง / ทีม' },
  { label: 'สถานะการเรียน' },
  { label: 'คอร์สล่าสุด' },
  { label: 'เรียนล่าสุด' },
  { label: 'จัดการ', className: 'text-right' },
];

const getDefaultFormData = () => ({
  name: '',
  email: '',
  password: '',
  role: USER_ROLES.USER,
  departmentId: '',
  tierId: '',
  employmentDate: '',
  pointsBalance: 0,
});

const formatDateForInput = (value) => {
  if (!value) {
    return '';
  }

  return new Date(value).toISOString().slice(0, 10);
};

const getTrackingStatus = (user) => user.tracking?.status || ENROLLMENT_STATUS.NOT_STARTED;

const getTrackingTimestamp = (user) => {
  const latestLearningAt = user.tracking?.latestLearningAt;

  if (!latestLearningAt) {
    return 0;
  }

  const timestamp = new Date(latestLearningAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const UserManagement = () => {
  const toast = useToast();
  const { confirm, ConfirmDialogProps } = useConfirm();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [instructorPresets, setInstructorPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(FILTER_VALUES.ALL);
  const [selectedTier, setSelectedTier] = useState(FILTER_VALUES.ALL);
  const [selectedStatus, setSelectedStatus] = useState(FILTER_VALUES.ALL);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(getDefaultFormData());
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
  const [showInstructorPresetModal, setShowInstructorPresetModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const currentUser = useMemo(() => JSON.parse(localStorage.getItem('user') || 'null'), []);
  const canEditUsers = canEditAdminUsers(currentUser);
  const isManagerView = !canEditUsers;

  const fetchUsers = useCallback(async () => {
    try {
      const response = await adminAPI.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Fetch users error:', error);
      toast.error('ไม่สามารถโหลดข้อมูลพนักงานได้');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const requests = [
        adminAPI.getDepartments(),
        adminAPI.getTiers(),
        canEditUsers ? adminAPI.getInstructorPresets() : Promise.resolve({ data: [] }),
      ];

      const [departmentResponse, tierResponse, instructorPresetResponse] = await Promise.all(requests);
      setDepartments(departmentResponse.data);
      setTiers(tierResponse.data);
      setInstructorPresets(instructorPresetResponse.data);
    } catch (error) {
      console.error('Fetch reference data error:', error);
    } finally {
      setReferenceLoading(false);
    }
  }, [canEditUsers]);

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([fetchUsers(), fetchReferenceData()]);
    };

    bootstrap();
  }, [fetchReferenceData, fetchUsers]);

  const handleSaveUser = async (event) => {
    event.preventDefault();

    try {
      const payload = {
        ...formData,
        employmentDate: formData.employmentDate || null,
      };

      if (editingUser) {
        await adminAPI.updateUser(editingUser.id, payload);
        toast.success('อัปเดตข้อมูลผู้ใช้งานเรียบร้อย');
      } else {
        await adminAPI.createUser(payload);
        toast.success('เพิ่มผู้ใช้งานเรียบร้อย');
      }

      setShowUserModal(false);
      setEditingUser(null);
      setFormData(getDefaultFormData());
      fetchUsers();
    } catch (error) {
      console.error('Save user error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลผู้ใช้งานได้');
    }
  };

  const handleDeleteUser = async (id, name) => {
    const ok = await confirm({
      title: 'ยืนยันการลบผู้ใช้งาน',
      message: `ต้องการลบผู้ใช้งาน "${name}" ใช่หรือไม่?`,
      confirmLabel: 'ลบ',
      variant: 'danger',
    });

    if (!ok) {
      return;
    }

    try {
      await adminAPI.deleteUser(id);
      toast.success('ลบผู้ใช้งานเรียบร้อย');
      fetchUsers();
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error(error.response?.data?.message || 'ลบผู้ใช้งานไม่สำเร็จ');
    }
  };

  const handleViewUser = async (userId) => {
    try {
      setShowDetailModal(true);
      setDetailLoading(true);
      const response = await adminAPI.getUserDetails(userId);
      setSelectedUserDetail(response.data);
    } catch (error) {
      console.error('Fetch user detail error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถโหลดประวัติพนักงานได้');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openAddUser = () => {
    setEditingUser(null);
    setFormData(getDefaultFormData());
    setShowUserModal(true);
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role || USER_ROLES.USER,
      departmentId: user.departmentId || '',
      tierId: user.tierId || '',
      employmentDate: formatDateForInput(user.employmentDate),
      pointsBalance: user.pointsBalance || 0,
    });
    setShowUserModal(true);
  };

  const handleDepartmentDelete = async (id, name) => {
    const ok = await confirm({
      title: 'ยืนยันการลบแผนก',
      message: `ต้องการลบแผนก "${name}" ใช่หรือไม่?`,
      confirmLabel: 'ลบ',
      variant: 'danger',
    });

    if (!ok) {
      return;
    }

    try {
      await adminAPI.deleteDepartment(id);
      toast.success('ลบแผนกเรียบร้อย');
      await Promise.all([fetchReferenceData(), fetchUsers()]);
    } catch (error) {
      console.error('Delete department error:', error);
      toast.error(error.response?.data?.message || 'ลบแผนกไม่สำเร็จ');
    }
  };

  const handleTierDelete = async (id, name) => {
    const ok = await confirm({
      title: 'ยืนยันการลบระดับ',
      message: `ต้องการลบระดับ "${name}" ใช่หรือไม่?`,
      confirmLabel: 'ลบ',
      variant: 'danger',
    });

    if (!ok) {
      return;
    }

    try {
      await adminAPI.deleteTier(id);
      toast.success('ลบระดับผู้เรียนเรียบร้อย');
      await Promise.all([fetchReferenceData(), fetchUsers()]);
    } catch (error) {
      console.error('Delete tier error:', error);
      toast.error(error.response?.data?.message || 'ลบระดับไม่สำเร็จ');
    }
  };

  const handleTierReorder = async (reorderedItems) => {
    try {
      const tierIds = reorderedItems.map((item) => item.id);
      setTiers(reorderedItems);
      await adminAPI.reorderTiers(tierIds);
      toast.success('บันทึกลำดับระดับผู้เรียนเรียบร้อย');
    } catch (error) {
      console.error('Reorder tiers error:', error);
      toast.error('ไม่สามารถบันทึกลำดับได้');
      fetchReferenceData();
    }
  };

  const handleInstructorPresetDelete = async (id, name) => {
    const ok = await confirm({
      title: 'ยืนยันการลบข้อมูลวิทยากร',
      message: `ต้องการลบข้อมูลวิทยากร "${name}" ใช่หรือไม่?`,
      confirmLabel: 'ลบ',
      variant: 'danger',
    });

    if (!ok) {
      return;
    }

    try {
      await adminAPI.deleteInstructorPreset(id);
      toast.success('ลบข้อมูลวิทยากรเรียบร้อย');
      await fetchReferenceData();
    } catch (error) {
      console.error('Delete instructor preset error:', error);
      toast.error(error.response?.data?.message || 'ลบข้อมูลวิทยากรไม่สำเร็จ');
    }
  };

  const searchKeyword = searchTerm.trim().toLowerCase();

  const trackingUsers = useMemo(() => (
    users.filter((user) => {
      const latestCourseTitle = user.tracking?.latestCourseTitle?.toLowerCase() || '';
      const departmentName = (user.department || '').toLowerCase();
      const tierName = (user.tier?.name || '').toLowerCase();
      const matchesKeyword =
        !searchKeyword ||
        user.name.toLowerCase().includes(searchKeyword) ||
        user.email.toLowerCase().includes(searchKeyword) ||
        latestCourseTitle.includes(searchKeyword) ||
        departmentName.includes(searchKeyword) ||
        tierName.includes(searchKeyword);

      const matchesDepartment =
        selectedDepartment === FILTER_VALUES.ALL || user.departmentId === selectedDepartment;

      const matchesTier =
        selectedTier === FILTER_VALUES.ALL || user.tierId === selectedTier;

      return matchesKeyword && matchesDepartment && matchesTier;
    })
  ), [searchKeyword, selectedDepartment, selectedTier, users]);

  const trackingSummary = useMemo(() => (
    trackingUsers.reduce((summary, user) => {
      const status = getTrackingStatus(user);
      summary.total += 1;
      summary[status] += 1;
      return summary;
    }, {
      total: 0,
      [ENROLLMENT_STATUS.COMPLETED]: 0,
      [ENROLLMENT_STATUS.IN_PROGRESS]: 0,
      [ENROLLMENT_STATUS.NOT_STARTED]: 0,
    })
  ), [trackingUsers]);

  const visibleUsers = useMemo(() => (
    trackingUsers
      .filter((user) => (
        selectedStatus === FILTER_VALUES.ALL || getTrackingStatus(user) === selectedStatus
      ))
      .sort((leftUser, rightUser) => {
        const statusDiff =
          (STATUS_SORT_ORDER[getTrackingStatus(leftUser)] ?? 99) -
          (STATUS_SORT_ORDER[getTrackingStatus(rightUser)] ?? 99);

        if (statusDiff !== 0) {
          return statusDiff;
        }

        const timestampDiff = getTrackingTimestamp(rightUser) - getTrackingTimestamp(leftUser);
        if (timestampDiff !== 0) {
          return timestampDiff;
        }

        return leftUser.name.localeCompare(rightUser.name, 'th');
      })
  ), [selectedStatus, trackingUsers]);

  const pageTitle = isManagerView ? 'Training Tracking ของทีม' : 'Training Tracking';
  const pageSubtitle = isManagerView
    ? `ติดตามความพร้อมของพนักงานในแผนก ${currentUser?.department || 'ของคุณ'} และคลิกดูประวัติรายบุคคลได้ทันที`
    : 'มองภาพรวมพนักงานว่าใครเรียนจบแล้ว กำลังเรียน หรือยังไม่เริ่ม พร้อม drill down เข้าไปดูประวัติได้ในคลิกเดียว';

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={(
          <div className="flex flex-wrap gap-2">
            {canEditUsers && (
              <>
                <button type="button" onClick={() => setShowDepartmentModal(true)} className="btn btn-outline">
                  <Settings2 size={18} />
                  จัดการแผนก
                </button>
                <button type="button" onClick={() => setShowTierModal(true)} className="btn btn-outline">
                  <Sparkles size={18} />
                  จัดการระดับผู้เรียน
                </button>
                <button type="button" onClick={() => setShowInstructorPresetModal(true)} className="btn btn-outline">
                  <Sparkles size={18} />
                  จัดการวิทยากร
                </button>
                <button type="button" onClick={openAddUser} className="btn btn-primary">
                  <Plus size={18} />
                  เพิ่มผู้ใช้งาน
                </button>
              </>
            )}
          </div>
        )}
      />

      <UserModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSave={handleSaveUser}
        editingUser={editingUser}
        formData={formData}
        setFormData={setFormData}
        departments={departments}
        tiers={tiers}
        canEditRole={canEditUsers}
      />

      {canEditUsers && (
        <>
          <ReferenceDataModal
            isOpen={showDepartmentModal}
            title="จัดการแผนก"
            description="เพิ่ม แก้ไข หรือลบแผนกที่ใช้กับการกำหนดผู้ใช้งานและสิทธิ์การมองเห็น"
            itemLabel="แผนก"
            items={departments}
            loading={referenceLoading}
            onClose={() => setShowDepartmentModal(false)}
            onCreate={async (payload) => {
              await adminAPI.createDepartment(payload);
              toast.success('สร้างแผนกเรียบร้อย');
              await Promise.all([fetchReferenceData(), fetchUsers()]);
            }}
            onUpdate={async (id, payload) => {
              await adminAPI.updateDepartment(id, payload);
              toast.success('อัปเดตแผนกเรียบร้อย');
              await Promise.all([fetchReferenceData(), fetchUsers()]);
            }}
            onDelete={handleDepartmentDelete}
          />

          <ReferenceDataModal
            isOpen={showTierModal}
            title="จัดการระดับผู้เรียน"
            description="กำหนดโครงสร้างระดับผู้เรียนเพื่อใช้กับสิทธิ์การเข้าถึงและการติดตามความคืบหน้า"
            itemLabel="ระดับ"
            items={tiers}
            loading={referenceLoading}
            onClose={() => setShowTierModal(false)}
            onCreate={async (payload) => {
              await adminAPI.createTier(payload);
              toast.success('สร้างระดับผู้เรียนเรียบร้อย');
              await Promise.all([fetchReferenceData(), fetchUsers()]);
            }}
            onUpdate={async (id, payload) => {
              await adminAPI.updateTier(id, payload);
              toast.success('อัปเดตระดับผู้เรียนเรียบร้อย');
              await Promise.all([fetchReferenceData(), fetchUsers()]);
            }}
            onDelete={handleTierDelete}
            onReorder={handleTierReorder}
            showAccessToggle={true}
          />

          <InstructorPresetModal
            isOpen={showInstructorPresetModal}
            presets={instructorPresets}
            loading={referenceLoading}
            onClose={() => setShowInstructorPresetModal(false)}
            onCreate={async (payload) => {
              await adminAPI.createInstructorPreset(payload);
              toast.success('สร้างข้อมูลวิทยากรเรียบร้อย');
              await fetchReferenceData();
            }}
            onUpdate={async (id, payload) => {
              await adminAPI.updateInstructorPreset(id, payload);
              toast.success('อัปเดตข้อมูลวิทยากรเรียบร้อย');
              await fetchReferenceData();
            }}
            onDelete={handleInstructorPresetDelete}
          />
        </>
      )}

      <UserDetailModal
        isOpen={showDetailModal}
        loading={detailLoading}
        detail={selectedUserDetail}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedUserDetail(null);
        }}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {TRACKING_SUMMARY_CONFIG.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className={`rounded-2xl border p-4 shadow-sm ${item.cardClassName}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.iconClassName}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className={`mt-6 text-3xl font-bold ${item.valueClassName}`}>
                {trackingSummary[item.key]}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card !overflow-visible">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Users size={16} className="text-primary" />
              รายชื่อพนักงานที่ติดตามได้
            </div>
            <p className="mt-1 text-sm text-muted">
              ทั้งหมด {trackingSummary.total} คน
              {selectedStatus !== FILTER_VALUES.ALL ? ' ตามสถานะที่เลือก' : ' จากเงื่อนไขที่กำลังดู'}
            </p>
          </div>
        </div>

        <UserFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedDepartment={selectedDepartment}
          onDepartmentChange={setSelectedDepartment}
          departments={departments}
          selectedTier={selectedTier}
          onTierChange={setSelectedTier}
          tiers={tiers}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />

        <UserList
          columns={TRACKING_COLUMNS}
          users={visibleUsers}
          loading={loading}
          onViewUser={handleViewUser}
          onEditUser={openEditUser}
          onDeleteUser={handleDeleteUser}
          canEditUsers={canEditUsers}
        />
      </div>
      <ConfirmDialog {...ConfirmDialogProps} />
    </div>
  );
};

export default UserManagement;
