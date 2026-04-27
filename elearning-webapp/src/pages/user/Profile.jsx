import React, { useEffect, useId, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authAPI, userAPI } from '../../utils/api';
import { useToast } from '../../context/useToast';
import Skeleton from '../../components/common/Skeleton';

// Sub-components
import ProfileHeader from '../../components/user/ProfileHeader';
import ProfileStats from '../../components/user/ProfileStats';
import ProfileActivities from '../../components/user/ProfileActivities';
import ProfileCertificates from '../../components/user/ProfileCertificates';
import ProfileSettings from '../../components/user/ProfileSettings';
import UpdatePasswordModal from '../../components/user/UpdatePasswordModal';
import PrivacyPolicyModal from '../../components/user/PrivacyPolicyModal';

const Profile = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [user, setUser] = useState(null);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [courses, setCourses] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [lmsCertificates, setLmsCertificates] = useState([]);
  const [savingCertificate, setSavingCertificate] = useState(false);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);

  const passwordDialogTitleId = useId();
  const policyDialogTitleId = useId();
  const currentPasswordId = useId();
  const newPasswordId = useId();
  const confirmNewPasswordId = useId();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [userRes, pointsRes, coursesRes, certificatesRes] = await Promise.all([
          authAPI.getCurrentUser(),
          userAPI.getPoints(),
          userAPI.getCourses(),
          userAPI.getCertificates(),
          userAPI.getLmsCertificates(),
        ]);
        setUser(userRes?.data || userRes);
        setPoints(pointsRes?.data?.balance ?? pointsRes?.balance ?? 0);
        setCourses(Array.isArray(coursesRes?.data) ? coursesRes.data : Array.isArray(coursesRes) ? coursesRes : []);
        setCertificates(Array.isArray(certificatesRes?.data) ? certificatesRes.data : Array.isArray(certificatesRes) ? certificatesRes : []);
        setLmsCertificates(Array.isArray(lmsCertificatesRes?.data) ? lmsCertificatesRes.data : Array.isArray(lmsCertificatesRes) ? lmsCertificatesRes : []);
      } catch (error) {
        console.error('Fetch profile error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.warning('กรุณากรอกรหัสผ่านให้ครบถ้วน');
      return;
    }

    if (newPassword.length < 6) {
      toast.warning('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.warning('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    try {
      setSavingPassword(true);
      await userAPI.updateProfile({ currentPassword, newPassword });
      setShowEditModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      toast.success('เปลี่ยนรหัสผ่านสำเร็จ');
    } catch (error) {
      console.error('Update password error', error);
      toast.error(error.response?.data?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleNotifications = () => {
    setNotificationsEnabled((current) => !current);
    toast.info(notificationsEnabled ? 'ปิดการแจ้งเตือนแล้ว' : 'เปิดการแจ้งเตือนแล้ว');
  };

  const handleCreateCertificate = async (payload) => {
    try {
      setSavingCertificate(true);
      const response = await userAPI.createCertificate(payload);
      const certificate = response?.data || response;
      setCertificates((current) => [certificate, ...current]);
      toast.success('เพิ่ม certificate สำเร็จ');
      return certificate;
    } catch (error) {
      console.error('Create certificate error', error);
      toast.error(error.response?.data?.message || 'เพิ่ม certificate ไม่สำเร็จ');
      return null;
    } finally {
      setSavingCertificate(false);
    }
  };

  const handleUpdateCertificate = async (certificateId, payload) => {
    try {
      setSavingCertificate(true);
      const response = await userAPI.updateCertificate(certificateId, payload);
      const certificate = response?.data || response;
      setCertificates((current) => current.map((item) => (item.id === certificateId ? certificate : item)));
      toast.success('อัปเดต certificate สำเร็จ');
      return certificate;
    } catch (error) {
      console.error('Update certificate error', error);
      toast.error(error.response?.data?.message || 'อัปเดต certificate ไม่สำเร็จ');
      return null;
    } finally {
      setSavingCertificate(false);
    }
  };

  const handleDeleteCertificate = async (certificateId) => {
    const confirmed = window.confirm('ลบ certificate นี้ออกจากโปรไฟล์?');
    if (!confirmed) return;

    try {
      await userAPI.deleteCertificate(certificateId);
      setCertificates((current) => current.filter((item) => item.id !== certificateId));
      toast.success('ลบ certificate แล้ว');
    } catch (error) {
      console.error('Delete certificate error', error);
      toast.error(error.response?.data?.message || 'ลบ certificate ไม่สำเร็จ');
    }
  };

  const handleUploadCertificateFile = async (file) => {
    try {
      setUploadingCertificate(true);
      const response = await userAPI.uploadCertificateFile(file);
      toast.success('อัปโหลดไฟล์สำเร็จ');
      return response?.data || response;
    } catch (error) {
      console.error('Upload certificate file error', error);
      toast.error(error.response?.data?.message || 'อัปโหลดไฟล์ไม่สำเร็จ');
      return null;
    } finally {
      setUploadingCertificate(false);
    }
  };

  if (loading) {
    return <Skeleton.List count={5} />;
  }

  return (
    <div className="flex h-full flex-col gap-6 animate-fade-in pb-8 pt-2">
      <ProfileHeader 
        user={user} 
        onOpenSettings={() => setShowEditModal(true)} 
      />

      <ProfileStats 
        user={user} 
        points={points} 
      />

      <ProfileActivities 
        courses={courses} 
        onNavigate={navigate} 
      />

      <ProfileCertificates
        certificates={certificates}
        lmsCertificates={lmsCertificates}
        saving={savingCertificate}
        uploading={uploadingCertificate}
        onCreate={handleCreateCertificate}
        onUpdate={handleUpdateCertificate}
        onDelete={handleDeleteCertificate}
        onUpload={handleUploadCertificateFile}
      />

      <ProfileSettings 
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={toggleNotifications}
        onShowPasswordModal={() => setShowEditModal(true)}
        onShowPrivacyModal={() => setShowPolicyModal(true)}
      />

      <div className="mb-8 mt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="card flex w-full items-center justify-center gap-2 border border-red-100 bg-white p-4 font-bold text-danger shadow-sm transition-colors hover:bg-red-50"
        >
          <LogOut size={20} />
          <span>ออกจากระบบ</span>
        </button>
      </div>

      <UpdatePasswordModal 
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmNewPassword('');
        }}
        currentPassword={currentPassword}
        setCurrentPassword={setCurrentPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmNewPassword={confirmNewPassword}
        setConfirmNewPassword={setConfirmNewPassword}
        savingPassword={savingPassword}
        onSave={handleUpdatePassword}
        passwordDialogTitleId={passwordDialogTitleId}
        currentPasswordId={currentPasswordId}
        newPasswordId={newPasswordId}
        confirmNewPasswordId={confirmNewPasswordId}
      />

      <PrivacyPolicyModal 
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        policyDialogTitleId={policyDialogTitleId}
      />
    </div>
  );
};

export default Profile;
