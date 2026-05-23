import React from 'react';
import { Plus, Settings2, Sparkles, Users } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import UserModal from '../../components/admin/UserModal';
import ReferenceDataModal from '../../components/admin/ReferenceDataModal';
import DepartmentSubdivisionModal from '../../components/admin/DepartmentSubdivisionModal';
import PositionManagementModal from '../../components/admin/PositionManagementModal';
import UserDetailModal from '../../components/admin/UserDetailModal';
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
  role: USER_ROLES.USER,
  roles: [],
  departmentId: '',
  tierId: '',
  employmentDate: '',
  pointsBalance: 0,
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

const UserManagement = () => {
  const toast = useToast();
  const { confirm, ConfirmDialogProps } = useConfirm();
  const [users, setUsers] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [tiers, setTiers] = React.useState([]);
  const [positionLevels, setPositionLevels] = React.useState([]);
  const [positionTypes, setPositionTypes] = React.useState([]);
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
  const [savingProfileDetails] = React.useState(false);
  const [uploadingProfileFile, setUploadingProfileFile] = React.useState(false);
  const [savingCertificate, setSavingCertificate] = React.useState(false);
  const [uploadingCertificate, setUploadingCertificate] = React.useState(false);

  const currentUser = React.useMemo(() => JSON.parse(localStorage.getItem('user') || 'null'), []);
  const canEditUsers = canEditAdminUsers(currentUser);
  const isManagerView = !canEditUsers;

  const fetchUsers = React.useCallback(async () => {
    try {
      const response = await adminAPI.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Fetch users error:', error);
      toast.error('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเธเธนเนเนเธเนเธเธฒเธเนเธ”เน');
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
      ];
      const [departmentResponse, tierResponse, cohortRoleResponse, levelsRes, typesRes] = await Promise.all(requests);
      setDepartments(departmentResponse.data);
      setTiers(tierResponse.data);
      setCohortRoles(cohortRoleResponse.data);
      setPositionLevels(levelsRes.data?.data || []);
      setPositionTypes(typesRes.data?.data || []);
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

    try {
      const payload = {
        ...formData,
        permission: formData.role,
        roles: formData.roles || [],
        employmentDate: formData.employmentDate || null,
      };

      if (editingUser) {
        await adminAPI.updateUser(editingUser.id, payload);
        toast.success('เธญเธฑเธเน€เธ”เธ•เธเนเธญเธกเธนเธฅเธเธนเนเนเธเนเธเธฒเธเน€เธฃเธตเธขเธเธฃเนเธญเธข');
      } else {
        await adminAPI.createUser(payload);
        toast.success('เน€เธเธดเนเธกเธเธนเนเนเธเนเธเธฒเธเน€เธฃเธตเธขเธเธฃเนเธญเธข');
      }

      setShowUserModal(false);
      setEditingUser(null);
      setFormData(getDefaultFormData());
      fetchUsers();
    } catch (error) {
      console.error('Save user error:', error);
      toast.error(error.response?.data?.message || 'เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธเธฑเธเธ—เธถเธเธเนเธญเธกเธนเธฅเธเธนเนเนเธเนเธเธฒเธเนเธ”เน');
    }
  };

  const handleDeleteUser = async (id, name) => {
    const ok = await confirm({
      title: 'เธขเธทเธเธขเธฑเธเธเธฒเธฃเธฅเธเธเธนเนเนเธเนเธเธฒเธ',
      message: `เธ•เนเธญเธเธเธฒเธฃเธฅเธเธเธนเนเนเธเนเธเธฒเธ "${name}" เนเธเนเธซเธฃเธทเธญเนเธกเน?`,
      confirmLabel: 'เธฅเธ',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await adminAPI.deleteUser(id);
      toast.success('เธฅเธเธเธนเนเนเธเนเธเธฒเธเน€เธฃเธตเธขเธเธฃเนเธญเธข');
      fetchUsers();
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error(error.response?.data?.message || 'เธฅเธเธเธนเนเนเธเนเธเธฒเธเนเธกเนเธชเธณเน€เธฃเนเธ');
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
      toast.error(error.response?.data?.message || 'เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธซเธฅเธ”เธเธฃเธฐเธงเธฑเธ•เธดเธเธนเนเนเธเนเธเธฒเธเนเธ”เน');
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
      role: user.permission || user.role || USER_ROLES.USER,
      roles: user.roles || [],
      departmentId: user.departmentId || '',
      tierId: user.tierId || '',
      employmentDate: formatDateForInput(user.employmentDate),
      pointsBalance: user.pointsBalance || 0,
      educationHistory: Array.isArray(user.educationHistory) ? user.educationHistory : [],
      profileFiles: Array.isArray(user.profileFiles) ? user.profileFiles : [],
      profileImageUrl: user.profileImageUrl || '',
    });
    setShowUserModal(true);
    setProfileCertificates([]);
    setLmsCertificates([]);
    Promise.all([
      adminAPI.getUserCertificates(user.id),
      adminAPI.getUserDetails(user.id)
    ]).then(([certificatesRes, detailsRes]) => {
      setProfileCertificates(Array.isArray(certificatesRes?.data) ? certificatesRes.data : []);
      setLmsCertificates(Array.isArray(detailsRes?.data?.systemCertificates) ? detailsRes.data.systemCertificates : []);
    }).catch((error) => {
      console.error('Fetch editable profile extras error:', error);
    });
  };

  const handleDepartmentDelete = async (id, name) => {
    const ok = await confirm({
      title: 'เธขเธทเธเธขเธฑเธเธเธฒเธฃเธฅเธเนเธเธเธ',
      message: `เธ•เนเธญเธเธเธฒเธฃเธฅเธเนเธเธเธ "${name}" เนเธเนเธซเธฃเธทเธญเนเธกเน?`,
      confirmLabel: 'เธฅเธ',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await adminAPI.deleteDepartment(id);
      toast.success('เธฅเธเนเธเธเธเน€เธฃเธตเธขเธเธฃเนเธญเธข');
      await Promise.all([fetchReferenceData(), fetchUsers()]);
    } catch (error) {
      console.error('Delete department error:', error);
      toast.error(error.response?.data?.message || 'เธฅเธเนเธเธเธเนเธกเนเธชเธณเน€เธฃเนเธ');
    }
  };

  const handleTierDelete = async (id, name) => {
    const ok = await confirm({
      title: 'เธขเธทเธเธขเธฑเธเธเธฒเธฃเธฅเธเธฃเธฐเธ”เธฑเธ',
      message: `เธ•เนเธญเธเธเธฒเธฃเธฅเธเธฃเธฐเธ”เธฑเธ "${name}" เนเธเนเธซเธฃเธทเธญเนเธกเน?`,
      confirmLabel: 'เธฅเธ',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await adminAPI.deleteTier(id);
      toast.success('เธฅเธเธฃเธฐเธ”เธฑเธเน€เธฃเธตเธขเธเธฃเนเธญเธข');
      await Promise.all([fetchReferenceData(), fetchUsers()]);
    } catch (error) {
      console.error('Delete tier error:', error);
      toast.error(error.response?.data?.message || 'เธฅเธเธฃเธฐเธ”เธฑเธเนเธกเนเธชเธณเน€เธฃเนเธ');
    }
  };

  const handleCohortRoleDelete = async (id, name) => {
    const ok = await confirm({
      title: 'เธขเธทเธเธขเธฑเธเธเธฒเธฃเธฅเธ Cohort Role',
      message: `เธ•เนเธญเธเธเธฒเธฃเธฅเธ role "${name}" เนเธเนเธซเธฃเธทเธญเนเธกเน? Role เธเธตเนเธเธฐเธ–เธนเธเธ–เธญเธ”เธญเธญเธเธเธฒเธเธเธนเนเนเธเนเธเธฒเธเธ—เธตเนเน€เธฅเธทเธญเธเนเธงเนเธ”เนเธงเธข`,
      confirmLabel: 'เธฅเธ',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await adminAPI.deleteCohortRole(id);
      toast.success('เธฅเธ Cohort Role เน€เธฃเธตเธขเธเธฃเนเธญเธข');
      await Promise.all([fetchReferenceData(), fetchUsers()]);
    } catch (error) {
      console.error('Delete cohort role error:', error);
      toast.error(error.response?.data?.message || 'เธฅเธ Cohort Role เนเธกเนเธชเธณเน€เธฃเนเธ');
    }
  };

  const handleTierReorder = async (reorderedItems) => {
    try {
      const tierIds = reorderedItems.map(item => item.id);
      setTiers(reorderedItems); // Optimistic update
      await adminAPI.reorderTiers(tierIds);
      toast.success('เธเธฑเธเธ—เธถเธเธฅเธณเธ”เธฑเธเธฃเธฐเธ”เธฑเธเน€เธฃเธตเธขเธเธฃเนเธญเธข');
    } catch (error) {
      console.error('Reorder tiers error:', error);
      toast.error('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธเธฑเธเธ—เธถเธเธฅเธณเธ”เธฑเธเนเธ”เน');
      fetchReferenceData(); // Rollback
    }
  };

  const handleCohortRoleReorder = async (reorderedItems) => {
    try {
      const roleIds = reorderedItems.map(item => item.id);
      setCohortRoles(reorderedItems);
      await adminAPI.reorderCohortRoles(roleIds);
      toast.success('เธเธฑเธเธ—เธถเธเธฅเธณเธ”เธฑเธ Cohort Role เน€เธฃเธตเธขเธเธฃเนเธญเธข');
    } catch (error) {
      console.error('Reorder cohort roles error:', error);
      toast.error('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธเธฑเธเธ—เธถเธเธฅเธณเธ”เธฑเธ Cohort Role เนเธ”เน');
      fetchReferenceData();
    }
  };

  const handleUploadEditableProfileFile = async (file) => {
    try {
      setUploadingProfileFile(true);
      const response = await adminAPI.uploadProfileFile(file);
      toast.success('เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเนเธเนเธญเธกเธนเธฅเธญเธทเนเธเน เธชเธณเน€เธฃเนเธ');
      return response?.data || response;
    } catch (error) {
      console.error('Upload profile file error:', error);
      toast.error(error.response?.data?.message || 'เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเนเนเธกเนเธชเธณเน€เธฃเนเธ');
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
      toast.error('เน€เธเธดเธ”เนเธเธฅเนเนเธกเนเธชเธณเน€เธฃเนเธ');
    }
  };

  const handleCreateEditableCertificate = async (payload) => {
    if (!editingUser?.id) return null;
    try {
      setSavingCertificate(true);
      const response = await adminAPI.createUserCertificate(editingUser.id, payload);
      const certificate = response?.data || response;
      setProfileCertificates((current) => [certificate, ...current]);
      toast.success('เน€เธเธดเนเธกเธเธฃเธฐเธงเธฑเธ•เธดเธญเธเธฃเธกเธชเธณเน€เธฃเนเธ');
      return certificate;
    } catch (error) {
      console.error('Create user certificate error:', error);
      toast.error(error.response?.data?.message || 'เน€เธเธดเนเธกเธเธฃเธฐเธงเธฑเธ•เธดเธญเธเธฃเธกเนเธกเนเธชเธณเน€เธฃเนเธ');
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
      toast.success('เธญเธฑเธเน€เธ”เธ•เธเธฃเธฐเธงเธฑเธ•เธดเธญเธเธฃเธกเธชเธณเน€เธฃเนเธ');
      return certificate;
    } catch (error) {
      console.error('Update user certificate error:', error);
      toast.error(error.response?.data?.message || 'เธญเธฑเธเน€เธ”เธ•เธเธฃเธฐเธงเธฑเธ•เธดเธญเธเธฃเธกเนเธกเนเธชเธณเน€เธฃเนเธ');
      return null;
    } finally {
      setSavingCertificate(false);
    }
  };

  const handleDeleteEditableCertificate = async (certificateId) => {
    if (!editingUser?.id) return;
    const ok = window.confirm('เธฅเธเธเธฃเธฐเธงเธฑเธ•เธดเธญเธเธฃเธกเธเธตเนเธญเธญเธเธเธฒเธเนเธเธฃเนเธเธฅเน?');
    if (!ok) return;

    try {
      await adminAPI.deleteUserCertificate(editingUser.id, certificateId);
      setProfileCertificates((current) => current.filter((item) => item.id !== certificateId));
      toast.success('เธฅเธเธเธฃเธฐเธงเธฑเธ•เธดเธญเธเธฃเธกเนเธฅเนเธง');
    } catch (error) {
      console.error('Delete user certificate error:', error);
      toast.error(error.response?.data?.message || 'เธฅเธเธเธฃเธฐเธงเธฑเธ•เธดเธญเธเธฃเธกเนเธกเนเธชเธณเน€เธฃเนเธ');
    }
  };

  const handleUploadEditableCertificateFile = async (file) => {
    try {
      setUploadingCertificate(true);
      const response = await adminAPI.uploadCertificateFile(file);
      toast.success('เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเน certificate เธชเธณเน€เธฃเนเธ');
      return response?.data || response;
    } catch (error) {
      console.error('Upload certificate file error:', error);
      toast.error(error.response?.data?.message || 'เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเน certificate เนเธกเนเธชเธณเน€เธฃเนเธ');
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
    { label: 'เธเธนเนเนเธเนเธเธฒเธ' },
    { label: 'Permission เธฃเธฐเธเธ' },
    { label: 'เธเธ—เธเธฒเธ— (Role)' },
    { label: 'เนเธเธเธ' },
    { label: 'เธเธฅเธธเนเธกเธเธฒเธ (Sub-division)' },
    { label: 'เธ•เธณเนเธซเธเนเธ (Position)' },
    { label: 'เธฃเธฐเธ”เธฑเธเธ•เธณเนเธซเธเนเธ (Level)' },
    { label: 'เธเธฃเธฐเน€เธ เธ—เธ•เธณเนเธซเธเนเธ (Type)' },
    { label: 'เธซเธฑเธงเธซเธเนเธฒเธเธฒเธ (Supervisor)' },
    { label: 'เน€เธฃเธดเนเธกเธเธฒเธ' },
    { label: 'เธเธญเธฃเนเธชเธ—เธตเนเธเธ', className: 'text-center' },
    { label: 'เนเธ•เนเธกเธชเธฐเธชเธก', className: 'text-right' },
    { label: 'เธเธฑเธ”เธเธฒเธฃ', className: 'text-right' },
  ], []);

  const handleExportProfiles = async () => {
    try {
      toast.info('เธเธณเธฅเธฑเธเธชเธฃเนเธฒเธเนเธเธฅเนเธฃเธฒเธขเธเธฒเธเธเนเธญเธกเธนเธฅเธเธนเนเนเธเนเธเธฒเธ เธเธฃเธธเธ“เธฒเธฃเธญเธชเธฑเธเธเธฃเธนเน...');
      const response = await adminAPI.exportUserProfiles();
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users_profile_report.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('เธ”เธฒเธงเธเนเนเธซเธฅเธ”เธฃเธฒเธขเธเธฒเธเธเนเธญเธกเธนเธฅเธเธนเนเนเธเนเธเธฒเธเธชเธณเน€เธฃเนเธ');
    } catch (error) {
      console.error('Export profiles error:', error);
      toast.error('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธ”เธฒเธงเธเนเนเธซเธฅเธ”เธฃเธฒเธขเธเธฒเธเธเนเธญเธกเธนเธฅเธเธนเนเนเธเนเธเธฒเธเนเธ”เน');
    }
  };

  const handleExportTrainings = async () => {
    try {
      toast.info('เธเธณเธฅเธฑเธเธชเธฃเนเธฒเธเนเธเธฅเนเธฃเธฒเธขเธเธฒเธ เธเธฃเธธเธ“เธฒเธฃเธญเธชเธฑเธเธเธฃเธนเน...');
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
      
      toast.success('เธ”เธฒเธงเธเนเนเธซเธฅเธ”เธฃเธฒเธขเธเธฒเธเธชเธณเน€เธฃเนเธ');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธ”เธฒเธงเธเนเนเธซเธฅเธ”เธฃเธฒเธขเธเธฒเธเนเธ”เน');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={`${isManagerView ? 'เธเธเธฑเธเธเธฒเธเนเธเนเธเธเธ' : 'เธเธนเนเนเธเนเธเธฒเธเธฃเธฐเธเธ'} (เธฃเธงเธก ${users.length} เธเธ)`}
        subtitle={isManagerView
          ? `เธ”เธนเธเนเธญเธกเธนเธฅเธเธนเนเนเธเนเธเธฒเธเน€เธเธเธฒเธฐเนเธเธเธ ${currentUser?.department || 'เธเธญเธเธเธธเธ“'} เนเธฅเธฐเธ•เธฃเธงเธเธชเธญเธเธเธฃเธฐเธงเธฑเธ•เธดเธเธฒเธฃเน€เธฃเธตเธขเธเธเธฑเธ Point เนเธ”เนเนเธเธ—เธตเนเน€เธ”เธตเธขเธง`
          : 'เน€เธเธดเนเธกเธเธนเนเนเธเนเธเธฒเธ เธเธฑเธ”เธเธฒเธฃเนเธเธเธ/เธฃเธฐเธ”เธฑเธ เนเธฅเธฐเธ”เธนเธเธฃเธฐเธงเธฑเธ•เธดเธเธฒเธฃเน€เธฃเธตเธขเธเธเธฑเธ Point เธฃเธฒเธขเธเธธเธเธเธฅ'}
        actions={(
          <div className="flex flex-wrap gap-2">
            {canEditUsers && (
              <>
                <button type="button" onClick={() => setShowDepartmentModal(true)} className="btn btn-outline">
                  <Settings2 size={18} />
                  เธเธฑเธ”เธเธฒเธฃเนเธเธเธ
                </button>
                <button type="button" onClick={() => setShowTierModal(true)} className="btn btn-outline">
                  <Sparkles size={18} />
                  เธเธฑเธ”เธเธฒเธฃเธ•เธณเนเธซเธเนเธ
                </button>
                <button type="button" onClick={() => setShowCohortRoleModal(true)} className="btn btn-outline">
                  <Users size={18} />
                  เธเธฑเธ”เธเธฒเธฃ Role
                </button>
                <div className="flex gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <button type="button" onClick={handleExportProfiles} className="btn btn-outline border-sky-200 bg-white text-sky-700 hover:bg-sky-50 hover:border-sky-300 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export เธเนเธญเธกเธนเธฅเธเธนเนเนเธเนเธเธฒเธ
                  </button>
                  <button type="button" onClick={handleExportTrainings} className="btn btn-outline border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export เธเธฃเธฐเธงเธฑเธ•เธดเธญเธเธฃเธก
                  </button>
                </div>
                <button type="button" onClick={openAddUser} className="btn btn-primary">
                  <Plus size={18} />
                  เน€เธเธดเนเธกเธเธนเนเนเธเนเธเธฒเธ
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
        cohortRoles={cohortRoles}
        canEditRole={canEditUsers}
        profileCertificates={profileCertificates}
        lmsCertificates={lmsCertificates}
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
          <DepartmentSubdivisionModal isOpen={showDepartmentModal} onClose={() => setShowDepartmentModal(false)} onPositionsChange={() => { fetchReferenceData(); fetchUsers(); }} />

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
            title="เธเธฑเธ”เธเธฒเธฃ Cohort Role"
            description="เน€เธเธดเนเธก เนเธเนเนเธ เธฅเธ เนเธฅเธฐเน€เธฃเธตเธขเธเธฅเธณเธ”เธฑเธ role เธ—เธตเนเนเธเน assign เธเธนเนเนเธเนเธเธฒเธ เน€เธเนเธ Trainee G1, Trainee G2, Trainee G3"
            itemLabel="Cohort Role"
            items={cohortRoles}
            loading={referenceLoading}
            onClose={() => setShowCohortRoleModal(false)}
            onCreate={async (payload) => {
              await adminAPI.createCohortRole(payload);
              toast.success('เธชเธฃเนเธฒเธ Cohort Role เน€เธฃเธตเธขเธเธฃเนเธญเธข');
              await fetchReferenceData();
            }}
            onUpdate={async (id, payload) => {
              await adminAPI.updateCohortRole(id, payload);
              toast.success('เธญเธฑเธเน€เธ”เธ• Cohort Role เน€เธฃเธตเธขเธเธฃเนเธญเธข');
              await fetchReferenceData();
            }}
            onDelete={handleCohortRoleDelete}
            onReorder={handleCohortRoleReorder}
            memberUsers={users}
            getMemberIds={(role) => users.filter((user) => (user.roles || []).includes(role.key)).map((user) => user.id)}
            onUpdateMembers={async (id, userIds) => {
              await adminAPI.updateCohortRoleMembers(id, userIds);
              toast.success('เธเธฑเธเธ—เธถเธเธชเธกเธฒเธเธดเธ Cohort Role เน€เธฃเธตเธขเธเธฃเนเธญเธข');
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
          cohortRoles={cohortRoles}
        />
      </div>
      <ConfirmDialog {...ConfirmDialogProps} />
    </div>
  );
};

export default UserManagement;

