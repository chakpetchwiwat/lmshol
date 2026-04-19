import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Settings2, Sparkles } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import UserModal from '../../components/admin/UserModal';
import ReferenceDataModal from '../../components/admin/ReferenceDataModal';
import InstructorPresetModal from '../../components/admin/InstructorPresetModal';
import UserDetailModal from '../../components/admin/UserDetailModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { canEditAdminUsers } from '../../utils/roles';
import { useToast } from '../../context/ToastContext';
import useConfirm from '../../hooks/useConfirm';
import { USER_ROLES } from '../../utils/constants/roles';
import { FILTER_VALUES } from '../../utils/constants/filters';

// Sub-components
import UserFilters from '../../components/admin/UserFilters';
import UserList from '../../components/admin/UserList';

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

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([fetchUsers(), fetchReferenceData()]);
    };

    bootstrap();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Fetch users error:', error);
      toast.error('ไม่สามารถโหลดข้อมูลผู้ใช้งานได้');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
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
  };

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
    if (!ok) return;

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
      toast.error(error.response?.data?.message || 'ไม่สามารถโหลดประวัติผู้ใช้งานได้');
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
    if (!ok) return;

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
    if (!ok) return;

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
      const tierIds = reorderedItems.map(item => item.id);
      setTiers(reorderedItems); // Optimistic update
      await adminAPI.reorderTiers(tierIds);
      toast.success('บันทึกลำดับระดับผู้เรียนเรียบร้อย');
    } catch (error) {
      console.error('Reorder tiers error:', error);
      toast.error('ไม่สามารถบันทึกลำดับได้');
      fetchReferenceData(); // Rollback
    }
  };

  const handleInstructorPresetDelete = async (id, name) => {
    const ok = await confirm({
      title: 'ยืนยันการลบข้อมูลวิทยากร',
      message: `ต้องการลบข้อมูลวิทยากร "${name}" ใช่หรือไม่?`,
      confirmLabel: 'ลบ',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await adminAPI.deleteInstructorPreset(id);
      toast.success('ลบข้อมูลวิทยากรเรียบร้อย');
      await fetchReferenceData();
    } catch (error) {
      console.error('Delete instructor preset error:', error);
      toast.error(error.response?.data?.message || 'ลบข้อมูลวิทยากรไม่สำเร็จ');
    }
  };


  const filteredUsers = useMemo(() => (
    users.filter((user) => {
      const keyword = searchTerm.trim().toLowerCase();
      const matchesKeyword =
        !keyword ||
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword);

      const matchesDepartment =
        selectedDepartment === FILTER_VALUES.ALL || user.departmentId === selectedDepartment;

      const matchesTier =
        selectedTier === FILTER_VALUES.ALL || user.tierId === selectedTier;

      return matchesKeyword && matchesDepartment && matchesTier;
    })
  ), [searchTerm, selectedDepartment, selectedTier, users]);

  const columns = [
    { label: 'ผู้ใช้งาน' },
    { label: 'Role ระบบ' },
    { label: 'แผนก' },
    { label: 'ระดับผู้เรียน' },
    { label: 'เริ่มงาน' },
    { label: 'คอร์สที่จบ', className: 'text-center' },
    { label: 'แต้มสะสม', className: 'text-right' },
    { label: 'จัดการ', className: 'text-right' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={isManagerView ? 'พนักงานในแผนก' : 'ผู้ใช้งานระบบ'}
        subtitle={isManagerView
          ? `ดูข้อมูลผู้ใช้งานเฉพาะแผนก ${currentUser?.department || 'ของคุณ'} และตรวจสอบประวัติการเรียนกับ Point ได้ในที่เดียว`
          : 'เพิ่มผู้ใช้งาน จัดการแผนก/ระดับ และดูประวัติการเรียนกับ Point รายบุคคล'}
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
            description="เพิ่ม แก้ไข หรือลบแผนกที่ใช้กับการกำหนดผู้ใช้งานและขอบเขตการมองเห็นคอร์ส"
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
            description="ระดับผู้เรียนจะถูกใช้แบบลำดับขั้น เช่น ตั้งแต่ Supervisor จะครอบคลุม Manager และ Director ที่สูงกว่า"
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

      <div className="card !overflow-visible">
        <UserFilters 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedDepartment={selectedDepartment}
          onDepartmentChange={setSelectedDepartment}
          departments={departments}
          selectedTier={selectedTier}
          onTierChange={setSelectedTier}
          tiers={tiers}
        />

        <UserList 
          columns={columns}
          users={filteredUsers}
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
