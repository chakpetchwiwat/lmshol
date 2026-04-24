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
  const [savingPassword, setSavingPassword] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [courses, setCourses] = useState([]);

  const passwordDialogTitleId = useId();
  const policyDialogTitleId = useId();
  const currentPasswordId = useId();
  const newPasswordId = useId();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [userRes, pointsRes, coursesRes] = await Promise.all([
          authAPI.getCurrentUser(),
          userAPI.getPoints(),
          userAPI.getCourses(),
        ]);
        setUser(userRes?.data || userRes);
        setPoints(pointsRes?.data?.balance ?? pointsRes?.balance ?? 0);
        setCourses(Array.isArray(coursesRes?.data) ? coursesRes.data : Array.isArray(coursesRes) ? coursesRes : []);
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
    if (!currentPassword || !newPassword) {
      toast.warning('กรุณากรอกรหัสผ่านให้ครบถ้วน');
      return;
    }

    if (newPassword.length < 6) {
      toast.warning('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    try {
      setSavingPassword(true);
      await userAPI.updateProfile({ currentPassword, newPassword });
      setShowEditModal(false);
      setCurrentPassword('');
      setNewPassword('');
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
        }}
        currentPassword={currentPassword}
        setCurrentPassword={setCurrentPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        savingPassword={savingPassword}
        onSave={handleUpdatePassword}
        passwordDialogTitleId={passwordDialogTitleId}
        currentPasswordId={currentPasswordId}
        newPasswordId={newPasswordId}
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
