import React from 'react';
import { Plus, Settings2, Sparkles, Users, ChevronDown, FileDown, Upload } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import UserModal from '../../components/admin/UserModal';
import ReferenceDataModal from '../../components/admin/ReferenceDataModal';
import DepartmentSubdivisionModal from '../../components/admin/DepartmentSubdivisionModal';
import PositionManagementModal from '../../components/admin/PositionManagementModal';
import UserDetailModal from '../../components/admin/UserDetailModal';
import ImportModal from '../../components/admin/ImportModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { canEditAdminUsers } from '../../utils/roles';
import { useToast } from '../../context/useToast';
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
  mustChangePassword: false,
  role: USER_ROLES.USER,
  roles: [],
  roleLevels: {},
  departmentId: '',
  tierId: '',
  employmentDate: '',
  pointsBalance: 0,
  subdivision: '',
  positionLevel: '',
  positionType: '',
  educationHistory: [],
  profileFiles: [],
  profileImageUrl: '',
});

const formatDateForInput = (value) => {
  if (!value) {
    return '';
  }

  return new Date(value).toISOString().slice(0, 10);
};

const normalizeEducationHistory = (edu) => {
  if (Array.isArray(edu)) return edu;
  if (edu && typeof edu === 'object') {
    const list = [];
    if (edu.institution || edu.degreeName || edu.fieldOfStudy || edu.level) {
      list.push({
        id: 'edu_imported_base',
        institution: edu.institution || '',
        degree: edu.degreeName || edu.level || '',
        faculty: '',
        major: edu.fieldOfStudy || '',
        graduationYear: '',
      });
    }
    if (edu.highestInstitution || edu.highestDegreeName || edu.highestFieldOfStudy || edu.highestLevel) {
      list.push({
        id: 'edu_imported_highest',
        institution: edu.highestInstitution || '',
        degree: edu.highestDegreeName || edu.highestLevel || '',
        faculty: '',
        major: edu.highestFieldOfStudy || '',
        graduationYear: '',
      });
    }
    return list;
  }
  return [];
};

const normalizeProfileFiles = (files) => {
  if (Array.isArray(files)) return files;
  if (files && typeof files === 'object') {
    const list = [];
    if (files.cv) {
      list.push({
        id: 'file_imported_cv',
        title: 'CV (Curriculum Vitae)',
        fileName: 'CV_imported.pdf',
        fileKey: '',
        fileUrl: files.cv,
        fileMimeType: 'application/pdf',
        uploadedAt: new Date().toISOString(),
      });
    }
    if (files.jobDescription) {
      list.push({
        id: 'file_imported_jd',
        title: 'Job Description',
        fileName: 'Job_Description_imported.pdf',
        fileKey: '',
        fileUrl: files.jobDescription,
        fileMimeType: 'application/pdf',
        uploadedAt: new Date().toISOString(),
      });
    }
    return list;
  }
  return [];
};

const UserManagement = () => {
  const toast = useToast();
  const { confirm, ConfirmDialogProps } = useConfirm();
  const [users, setUsers] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [tiers, setTiers] = React.useState([]);
  const [positionLevels, setPositionLevels] = React.useState([]);
  const [positionTypes, setPositionTypes] = React.useState([]);
  const [subdivisions, setSubdivisions] = React.useState([]);
  const [cohortRoles, setCohortRoles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [referenceLoading, setReferenceLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedDepartment, setSelectedDepartment] = React.useState(FILTER_VALUES.ALL);
  const [selectedTier, setSelectedTier] = React.useState(FILTER_VALUES.ALL);

  const [showUserModal, setShowUserModal] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState(null);
  const [formData, setFormData] = React.useState(getDefaultFormData());

  const [showDepartmentModal, setShowDepartmentModal] = React.useState(false);
  const [showTierModal, setShowTierModal] = React.useState(false);
  const [showCohortRoleModal, setShowCohortRoleModal] = React.useState(false);

  const [showDetailModal, setShowDetailModal] = React.useState(false);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = React.useState(null);
  const [profileCertificates, setProfileCertificates] = React.useState([]);
  const [lmsCertificates, setLmsCertificates] = React.useState([]);
  const [competencies, setCompetencies] = React.useState([]);
  const [savingProfileDetails] = React.useState(false);
  const [uploadingProfileFile, setUploadingProfileFile] = React.useState(false);
  const [savingCertificate, setSavingCertificate] = React.useState(false);
  const [uploadingCertificate, setUploadingCertificate] = React.useState(false);
  const [showExportDropdown, setShowExportDropdown] = React.useState(false);
  const [showImportDropdown, setShowImportDropdown] = React.useState(false);
  const [importModalOpen, setImportModalOpen] = React.useState(false);
  const [importModalType, setImportModalType] = React.useState('profiles');

  const currentUser = React.useMemo(() => JSON.parse(localStorage.getItem('user') || 'null'), []);
  const canEditUsers = canEditAdminUsers(currentUser);
  const isManagerView = !canEditUsers;

  const fetchUsers = React.useCallback(async () => {
    try {
      const response = await adminAPI.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Fetch users error:', error);
      toast.error('ไม่สามารถโหลดข้อมูลผู้ใช้งานได้');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchReferenceData = React.useCallback(async () => {
    try {
      const requests = [
        adminAPI.getDepartments(),
        adminAPI.getTiers(),
        adminAPI.getCohortRoles(),
        adminAPI.getSetting('POSITION_LEVELS'),
        adminAPI.getSetting('POSITION_TYPES'),
        adminAPI.getSetting('SUBDIVISIONS'),
      ];
      const [departmentResponse, tierResponse, cohortRoleResponse, levelsRes, typesRes, subdivRes, competenciesRes] = await Promise.all([
        ...requests,
        adminAPI.getCompetencies()
      ]);
      setDepartments(departmentResponse.data);
      setTiers(tierResponse.data);
      setCohortRoles(cohortRoleResponse.data);
      setPositionLevels(Array.isArray(levelsRes.data) ? levelsRes.data : levelsRes.data?.data || []);
      setPositionTypes(Array.isArray(typesRes.data) ? typesRes.data : typesRes.data?.data || []);
      setSubdivisions((Array.isArray(subdivRes.data) ? subdivRes.data : subdivRes.data?.data || []).map(x => (typeof x === 'string' ? { name: x } : x)));
      setCompetencies(Array.isArray(competenciesRes.data) ? competenciesRes.data : []);
    } catch (error) {
      console.error('Fetch reference data error:', error);
    } finally {
      setReferenceLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([fetchUsers(), fetchReferenceData()]);
    };

    bootstrap();
  }, [fetchReferenceData, fetchUsers]);

  const handleSaveUser = async (event) => {
    event.preventDefault();

    if (formData.password && formData.password.length < 8) {
      toast.warning('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
      return;
    }

    try {
      const payload = {
        ...formData,
        permission: formData.role,
        roles: formData.roles || [],
        roleLevels: formData.roleLevels || {},
        employmentDate: formData.employmentDate || null,
        mustChangePassword: formData.mustChangePassword,
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
    setProfileCertificates([]);
    setLmsCertificates([]);
    setShowUserModal(true);
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      mustChangePassword: !!user.mustChangePassword,
      role: user.permission || user.role || USER_ROLES.USER,
      roles: user.roles || [],
      roleLevels: user.roleLevels || {},
      departmentId: user.departmentId || '',
      tierId: user.tierId || '',
      employmentDate: formatDateForInput(user.employmentDate),
      pointsBalance: user.pointsBalance || 0,
      subdivision: user.subdivision || '',
      positionLevel: user.positionLevel || '',
      positionType: user.positionType || '',
      educationHistory: normalizeEducationHistory(user.educationHistory),
      profileFiles: normalizeProfileFiles(user.profileFiles),
      profileImageUrl: user.profileImageUrl || '',
    });
    setShowUserModal(true);
    setProfileCertificates([]);
    setLmsCertificates([]);
    Promise.all([
      adminAPI.getUserCertificates(user.id),
      adminAPI.getUserDetails(user.id),
    ]).then(([certificatesRes, detailsRes]) => {
      setProfileCertificates(Array.isArray(certificatesRes?.data) ? certificatesRes.data : []);
      setLmsCertificates(Array.isArray(detailsRes?.data?.systemCertificates) ? detailsRes.data.systemCertificates : []);
    }).catch((error) => {
      console.error('Fetch editable profile extras error:', error);
    });
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
      toast.success('ลบระดับเรียบร้อย');
      await Promise.all([fetchReferenceData(), fetchUsers()]);
    } catch (error) {
      console.error('Delete tier error:', error);
      toast.error(error.response?.data?.message || 'ลบระดับไม่สำเร็จ');
    }
  };

  const handleCohortRoleDelete = async (id, name) => {
    const ok = await confirm({
      title: 'ยืนยันการลบ Cohort Role',
      message: `ต้องการลบ role "${name}" ใช่หรือไม่? Role นี้จะถูกถอดออกจากผู้ใช้งานที่เลือกไว้ด้วย`,
      confirmLabel: 'ลบ',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await adminAPI.deleteCohortRole(id);
      toast.success('ลบ Role เรียบร้อย');
      await Promise.all([fetchReferenceData(), fetchUsers()]);
    } catch (error) {
      console.error('Delete cohort role error:', error);
      toast.error(error.response?.data?.message || 'ลบ Role ไม่สำเร็จ');
    }
  };

  const handleTierReorder = async (reorderedItems) => {
    try {
      const tierIds = reorderedItems.map(item => item.id);
      setTiers(reorderedItems); // Optimistic update
      await adminAPI.reorderTiers(tierIds);
      toast.success('บันทึกลำดับระดับเรียบร้อย');
    } catch (error) {
      console.error('Reorder tiers error:', error);
      toast.error('ไม่สามารถบันทึกลำดับได้');
      fetchReferenceData(); // Rollback
    }
  };

  const handleCohortRoleReorder = async (reorderedItems) => {
    try {
      const roleIds = reorderedItems.map(item => item.id);
      setCohortRoles(reorderedItems);
      await adminAPI.reorderCohortRoles(roleIds);
      toast.success('บันทึกลำดับกลุ่มงานเรียบร้อย');
    } catch (error) {
      console.error('Reorder cohort roles error:', error);
      toast.error('ไม่สามารถบันทึกลำดับกลุ่มงานได้');
      fetchReferenceData();
    }
  };

  const handleUploadEditableProfileFile = async (file) => {
    try {
      setUploadingProfileFile(true);
      const response = await adminAPI.uploadProfileFile(file);
      toast.success('อัปโหลดไฟล์ข้อมูลอื่นๆ สำเร็จ');
      return response?.data || response;
    } catch (error) {
      console.error('Upload profile file error:', error);
      toast.error(error.response?.data?.message || 'อัปโหลดไฟล์ไม่สำเร็จ');
      return null;
    } finally {
      setUploadingProfileFile(false);
    }
  };

  const handleOpenEditableProfileFile = async (file) => {
    try {
      if (file.fileUrl) {
        window.open(file.fileUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      if (!file.fileKey) return;
      const response = await adminAPI.getProfileFileDownloadUrl(file.fileKey);
      const url = response?.data?.url || response?.url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Open profile file error:', error);
      toast.error('เปิดไฟล์ไม่สำเร็จ');
    }
  };

  const handleCreateEditableCertificate = async (payload) => {
    if (!editingUser?.id) return null;
    try {
      setSavingCertificate(true);
      const response = await adminAPI.createUserCertificate(editingUser.id, payload);
      const certificate = response?.data || response;
      setProfileCertificates((current) => [certificate, ...current]);
      toast.success('เพิ่มประวัติอบรมสำเร็จ');
      return certificate;
    } catch (error) {
      console.error('Create user certificate error:', error);
      toast.error(error.response?.data?.message || 'เพิ่มประวัติอบรมไม่สำเร็จ');
      return null;
    } finally {
      setSavingCertificate(false);
    }
  };

  const handleUpdateEditableCertificate = async (certificateId, payload) => {
    if (!editingUser?.id) return null;
    try {
      setSavingCertificate(true);
      const response = await adminAPI.updateUserCertificate(editingUser.id, certificateId, payload);
      const certificate = response?.data || response;
      setProfileCertificates((current) => current.map((item) => (item.id === certificateId ? certificate : item)));
      toast.success('อัปเดตประวัติอบรมสำเร็จ');
      return certificate;
    } catch (error) {
      console.error('Update user certificate error:', error);
      toast.error(error.response?.data?.message || 'อัปเดตประวัติอบรมไม่สำเร็จ');
      return null;
    } finally {
      setSavingCertificate(false);
    }
  };

  const handleDeleteEditableCertificate = async (certificateId) => {
    if (!editingUser?.id) return;
    const ok = window.confirm('ลบประวัติอบรมนี้ออกจากโปรไฟล์?');
    if (!ok) return;

    try {
      await adminAPI.deleteUserCertificate(editingUser.id, certificateId);
      setProfileCertificates((current) => current.filter((item) => item.id !== certificateId));
      toast.success('ลบประวัติอบรมแล้ว');
    } catch (error) {
      console.error('Delete user certificate error:', error);
      toast.error(error.response?.data?.message || 'ลบประวัติอบรมไม่สำเร็จ');
    }
  };

  const handleUploadEditableCertificateFile = async (file) => {
    try {
      setUploadingCertificate(true);
      const response = await adminAPI.uploadCertificateFile(file);
      toast.success('อัปโหลดไฟล์ certificate สำเร็จ');
      return response?.data || response;
    } catch (error) {
      console.error('Upload certificate file error:', error);
      toast.error(error.response?.data?.message || 'อัปโหลดไฟล์ certificate ไม่สำเร็จ');
      return null;
    } finally {
      setUploadingCertificate(false);
    }
  };

  const filteredUsers = React.useMemo(() => {
    const tierOrderMap = Object.fromEntries(tiers.map((t) => [t.id, t.order]));
    
    return users
      .filter((user) => {
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
      .sort((a, b) => {
        const orderA = tierOrderMap[a.tierId] ?? 999;
        const orderB = tierOrderMap[b.tierId] ?? 999;
        
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        
        return a.name.localeCompare(b.name, 'th');
      });
  }, [searchTerm, selectedDepartment, selectedTier, users, tiers]);

  const columns = React.useMemo(() => [
    { label: 'ผู้ใช้งาน' },
    { label: 'บทบาท (Role)' },
    { label: 'แผนก' },
    { label: 'กลุ่มงาน (Sub-division)' },
    { label: 'ตำแหน่ง (Position)' },
    { label: 'ระดับตำแหน่ง (Level)' },
    { label: 'คอร์สที่จบ', className: 'text-center' },
    { label: 'จัดการ', className: 'text-right' },
  ], []);

  const handleExportProfiles = async () => {
    try {
      toast.info('กำลังสร้างไฟล์รายงานข้อมูลผู้ใช้งาน กรุณารอสักครู่...');
      const response = await adminAPI.exportUserProfiles();
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users_profile_report.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('ดาวน์โหลดรายงานข้อมูลผู้ใช้งานสำเร็จ');
    } catch (error) {
      console.error('Export profiles error:', error);
      toast.error('ไม่สามารถดาวน์โหลดรายงานข้อมูลผู้ใช้งานได้');
    }
  };

  const handleExportTrainings = async () => {
    try {
      toast.info('กำลังสร้างไฟล์รายงาน กรุณารอสักครู่...');
      const response = await adminAPI.exportUserTrainings();
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'training_report.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('ดาวน์โหลดรายงานสำเร็จ');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('ไม่สามารถดาวน์โหลดรายงานได้');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={`${isManagerView ? 'พนักงานในแผนก' : 'ผู้ใช้งานระบบ'} (รวม ${users.length} คน)`}
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
                  จัดการตำแหน่ง
                </button>
                <button type="button" onClick={() => setShowCohortRoleModal(true)} className="btn btn-outline">
                  <Users size={18} />
                  จัดการ Role ({(cohortRoles || []).length})
                </button>
                {/* Export Excel Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    className="btn btn-outline border-sky-200 bg-white text-sky-700 hover:bg-sky-50 hover:border-sky-300 shadow-sm flex items-center gap-1.5"
                  >
                    <FileDown size={18} />
                    <span>Export Excel</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${showExportDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showExportDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowExportDropdown(false)} />
                      <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl z-20">
                        <button
                          type="button"
                          onClick={() => {
                            setShowExportDropdown(false);
                            handleExportProfiles();
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Export ประวัติผู้เรียน
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowExportDropdown(false);
                            handleExportTrainings();
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Export ประวัติอบรม
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Import Excel Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowImportDropdown(!showImportDropdown)}
                    className="btn btn-outline border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 shadow-sm flex items-center gap-1.5"
                  >
                    <Upload size={18} />
                    <span>Import Excel</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${showImportDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showImportDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowImportDropdown(false)} />
                      <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl z-20">
                        <button
                          type="button"
                          onClick={() => {
                            setShowImportDropdown(false);
                            setImportModalType('profiles');
                            setImportModalOpen(true);
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Import ประวัติผู้เรียน
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowImportDropdown(false);
                            setImportModalType('trainings');
                            setImportModalOpen(true);
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Import ประวัติอบรม
                        </button>
                        <div className="my-1 border-t border-slate-100" />
                        <button
                          type="button"
                          onClick={async () => {
                            setShowImportDropdown(false);
                            try {
                                toast.info('กำลังดาวน์โหลดแบบฟอร์ม...');
                                const response = await adminAPI.downloadTemplate('profiles');
                                const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', 'แบบฟอร์ม_ประวัติผู้เรียน.xlsx');
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                toast.success('ดาวน์โหลดแบบฟอร์มสำเร็จ');
                            } catch (e) {
                                toast.error('ดาวน์โหลดแบบฟอร์มไม่สำเร็จ');
                            }
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-500 hover:bg-slate-50"
                        >
                          <FileDown size={14} className="text-slate-400" />
                          Template ประวัติผู้เรียน
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setShowImportDropdown(false);
                            try {
                                toast.info('กำลังดาวน์โหลดแบบฟอร์ม...');
                                const response = await adminAPI.downloadTemplate('trainings');
                                const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', 'แบบฟอร์ม_ประวัติอบรม.xlsx');
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                toast.success('ดาวน์โหลดแบบฟอร์มสำเร็จ');
                            } catch (e) {
                                toast.error('ดาวน์โหลดแบบฟอร์มไม่สำเร็จ');
                            }
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-500 hover:bg-slate-50"
                        >
                          <FileDown size={14} className="text-slate-400" />
                          Template ประวัติอบรม
                        </button>
                      </div>
                    </>
                  )}
                </div>
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
        positionLevels={positionLevels}
        positionTypes={positionTypes}
        subdivisions={subdivisions}
        cohortRoles={cohortRoles}
        canEditRole={canEditUsers}
        profileCertificates={profileCertificates}
        lmsCertificates={lmsCertificates}
        competencies={competencies}
        savingProfileDetails={savingProfileDetails}
        uploadingProfileFile={uploadingProfileFile}
        savingCertificate={savingCertificate}
        uploadingCertificate={uploadingCertificate}
        onUploadProfileFile={handleUploadEditableProfileFile}
        onOpenProfileFile={handleOpenEditableProfileFile}
        onCreateCertificate={handleCreateEditableCertificate}
        onUpdateCertificate={handleUpdateEditableCertificate}
        onDeleteCertificate={handleDeleteEditableCertificate}
        onUploadCertificate={handleUploadEditableCertificateFile}
      />

      {canEditUsers && (
        <>
          <DepartmentSubdivisionModal
            isOpen={showDepartmentModal}
            onClose={() => setShowDepartmentModal(false)}
            onPositionsChange={() => {
              fetchReferenceData();
              fetchUsers();
            }}
          />

          <PositionManagementModal
            isOpen={showTierModal}
            onClose={() => setShowTierModal(false)}
            onPositionsChange={() => {
              fetchReferenceData();
              fetchUsers();
            }}
          />

          <ReferenceDataModal
            isOpen={showCohortRoleModal}
            title="จัดการ Role"
            description="เพิ่ม แก้ไข ลบ และเรียงลำดับ Role ที่ใช้กำหนดให้กับผู้ใช้งาน เช่น Trainee G1, Trainee G2, Trainee G3"
            itemLabel="Role"
            items={cohortRoles}
            loading={referenceLoading}
            onClose={() => setShowCohortRoleModal(false)}
            onCreate={async (payload) => {
              await adminAPI.createCohortRole(payload);
              toast.success('สร้าง Role เรียบร้อย');
              await fetchReferenceData();
            }}
            onUpdate={async (id, payload) => {
              await adminAPI.updateCohortRole(id, payload);
              toast.success('อัปเดต Role เรียบร้อย');
              await fetchReferenceData();
            }}
            onDelete={handleCohortRoleDelete}
            onReorder={handleCohortRoleReorder}
            memberUsers={users}
            getMembers={(role) => {
              const roleSupervisorIds = (role.roleSupervisors || []).map((assignment) => assignment.supervisorId);
              return users.filter((user) => (user.roles || []).includes(role.key)).map((user) => ({
                userId: user.id,
                level: user.roleLevels?.[role.key] || '',
                isSupervisor: roleSupervisorIds.includes(user.id)
              }));
            }}
            onUpdateMembers={async (id, members) => {
              await adminAPI.updateCohortRoleMembers(id, members);
              toast.success('บันทึกสมาชิกเรียบร้อย');
              await Promise.all([fetchReferenceData(), fetchUsers()]);
            }}
          />

        </>
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

      <div className="card !overflow-visible w-full min-w-0">
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
          cohortRoles={cohortRoles}
        />
      </div>
      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        type={importModalType}
        onImportSuccess={fetchUsers}
      />
      <ConfirmDialog {...ConfirmDialogProps} />
    </div>
  );
};

export default UserManagement;
