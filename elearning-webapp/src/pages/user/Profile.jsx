import React from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI, userAPI } from '../../utils/api';
import { useToast } from '../../context/useToast';
import Skeleton from '../../components/common/Skeleton';

// Sub-components
import ProfileHeader from '../../components/user/ProfileHeader';
import ProfileEducationSection from '../../components/user/ProfileEducationSection';
import ProfileFilesSection from '../../components/user/ProfileFilesSection';
import ProfileActivities from '../../components/user/ProfileActivities';
import ProfileCertificates from '../../components/user/ProfileCertificates';
import ProfileSettings from '../../components/user/ProfileSettings';
import UpdatePasswordModal from '../../components/user/UpdatePasswordModal';
import PrivacyPolicyModal from '../../components/user/PrivacyPolicyModal';

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmNewPassword, setConfirmNewPassword] = React.useState('');
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [showPolicyModal, setShowPolicyModal] = React.useState(false);
  const [courses, setCourses] = React.useState([]);
  const [certificates, setCertificates] = React.useState([]);
  const [lmsCertificates, setLmsCertificates] = React.useState([]);
  const [savingCertificate, setSavingCertificate] = React.useState(false);
  const [uploadingCertificate, setUploadingCertificate] = React.useState(false);
  const [savingProfileDetails, setSavingProfileDetails] = React.useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = React.useState(false);
  const [uploadingProfileFile, setUploadingProfileFile] = React.useState(false);
  const [savingSignature, setSavingSignature] = React.useState(false);
  const [uploadingSignature, setUploadingSignature] = React.useState(false);

  const passwordDialogTitleId = React.useId();
  const policyDialogTitleId = React.useId();
  const currentPasswordId = React.useId();
  const newPasswordId = React.useId();
  const confirmNewPasswordId = React.useId();

  const isForced = !!(user?.mustChangePassword) || !!(location.state?.forcePasswordChange);

  React.useEffect(() => {
    if (isForced) {
      setShowEditModal(true);
    }
  }, [isForced]);

  const getNormalizedEducation = (eduHistory) => {
    if (!eduHistory) return [];
    if (Array.isArray(eduHistory)) return eduHistory;

    const normalized = [];
    if (eduHistory.institution || eduHistory.degreeName || eduHistory.fieldOfStudy || eduHistory.level) {
      normalized.push({
        id: 'standard_edu',
        institution: eduHistory.institution || '',
        degree: eduHistory.degreeName || eduHistory.level || '',
        faculty: '',
        major: eduHistory.fieldOfStudy || '',
        graduationYear: '',
      });
    }
    if (eduHistory.highestInstitution || eduHistory.highestDegreeName || eduHistory.highestFieldOfStudy || eduHistory.highestLevel) {
      normalized.push({
        id: 'highest_edu',
        institution: eduHistory.highestInstitution || '',
        degree: eduHistory.highestDegreeName || eduHistory.highestLevel || '',
        faculty: '',
        major: eduHistory.highestFieldOfStudy || '',
        graduationYear: '',
      });
    }
    return normalized;
  };

  const getNormalizedProfileFiles = (profileFiles) => {
    if (!profileFiles) return [];
    if (Array.isArray(profileFiles)) return profileFiles;

    const normalized = [];
    if (profileFiles.cv) {
      normalized.push({
        id: 'imported_cv',
        title: 'CV (Curriculum Vitae)',
        fileName: 'ไฟล์ประวัติการทำงาน',
        fileUrl: profileFiles.cv,
        fileKey: '',
        fileMimeType: 'application/pdf',
        uploadedAt: '',
      });
    }
    if (profileFiles.jobDescription) {
      normalized.push({
        id: 'imported_jd',
        title: 'Job Description',
        fileName: 'ไฟล์คำบรรยายลักษณะงาน',
        fileUrl: profileFiles.jobDescription,
        fileKey: '',
        fileMimeType: 'application/pdf',
        uploadedAt: '',
      });
    }
    return normalized;
  };

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const results = await Promise.allSettled([
          authAPI.getCurrentUser(),
          userAPI.getCourses(),
          userAPI.getCertificates(),
          userAPI.getLmsCertificates(),
        ]);

        const userRes = results[0].status === 'fulfilled' ? results[0].value : null;
        const coursesRes = results[1].status === 'fulfilled' ? results[1].value : null;
        const certificatesRes = results[2].status === 'fulfilled' ? results[2].value : null;
        const lmsCertificatesRes = results[3].status === 'fulfilled' ? results[3].value : null;

        if (userRes) {
          setUser(userRes?.data || userRes);
        } else if (results[0].status === 'rejected') {
          console.error('Fetch user details failed:', results[0].reason);
        }

        setCourses(coursesRes ? (Array.isArray(coursesRes?.data) ? coursesRes.data : Array.isArray(coursesRes) ? coursesRes : []) : []);
        setCertificates(certificatesRes ? (Array.isArray(certificatesRes?.data) ? certificatesRes.data : Array.isArray(certificatesRes) ? certificatesRes : []) : []);
        setLmsCertificates(lmsCertificatesRes ? (Array.isArray(lmsCertificatesRes?.data) ? lmsCertificatesRes.data : Array.isArray(lmsCertificatesRes) ? lmsCertificatesRes : []) : []);
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

    if (newPassword.length < 8) {
      toast.warning('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      toast.warning('รหัสผ่านใหม่ต้องมีตัวอักษรภาษาอังกฤษพิมพ์ใหญ่อย่างน้อย 1 ตัว (A-Z)');
      return;
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      toast.warning('รหัสผ่านใหม่ต้องมีอักขระพิเศษอย่างน้อย 1 ตัว (เช่น @, $, !, %, *, ?, &, #)');
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

  const applyUpdatedUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const handleSaveProfileDetails = async (payload, successMessage = 'บันทึกข้อมูลโปรไฟล์แล้ว') => {
    try {
      setSavingProfileDetails(true);
      const response = await userAPI.updateProfile(payload);
      const updatedUser = response?.data || response;
      applyUpdatedUser(updatedUser);
      toast.success(successMessage);
      return updatedUser;
    } catch (error) {
      console.error('Save profile details error', error);
      toast.error(error.response?.data?.message || 'บันทึกข้อมูลโปรไฟล์ไม่สำเร็จ');
      return null;
    } finally {
      setSavingProfileDetails(false);
    }
  };

  const handleUploadProfileImage = async (file) => {
    try {
      setUploadingProfileImage(true);
      const response = await userAPI.uploadProfileImage(file);
      const uploaded = response?.data || response;
      const profileImageUrl = uploaded?.fileUrl || uploaded?.fileKey;
      if (!profileImageUrl) throw new Error('Upload did not return a profile image URL');
      await handleSaveProfileDetails({ profileImageUrl }, 'เปลี่ยนรูปโปรไฟล์แล้ว');
    } catch (error) {
      console.error('Upload profile image error', error);
      toast.error(error.response?.data?.message || 'อัปโหลดรูปโปรไฟล์ไม่สำเร็จ');
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const handleSaveEducation = async (educationHistory) => {
    await handleSaveProfileDetails({ educationHistory }, 'บันทึกประวัติการศึกษาแล้ว');
  };

  const handleUploadProfileFile = async (file) => {
    try {
      setUploadingProfileFile(true);
      const response = await userAPI.uploadProfileFile(file);
      const uploaded = response?.data || response;
      const nextFile = {
        id: `${Date.now()}`,
        title: file.name,
        fileName: uploaded?.fileName || file.name,
        fileKey: uploaded?.fileKey || '',
        fileUrl: uploaded?.fileUrl || '',
        fileMimeType: uploaded?.fileMimeType || file.type,
        uploadedAt: new Date().toISOString(),
      };
      const currentFiles = getNormalizedProfileFiles(user?.profileFiles);
      await handleSaveProfileDetails({
        profileFiles: [nextFile, ...currentFiles]
      }, 'อัปโหลดไฟล์ข้อมูลอื่นๆ แล้ว');
    } catch (error) {
      console.error('Upload profile file error', error);
      toast.error(error.response?.data?.message || 'อัปโหลดไฟล์ไม่สำเร็จ');
    } finally {
      setUploadingProfileFile(false);
    }
  };

  const handleDeleteProfileFile = async (fileId) => {
    const currentFiles = getNormalizedProfileFiles(user?.profileFiles);
    await handleSaveProfileDetails({
      profileFiles: currentFiles.filter((file) => file.id !== fileId)
    }, 'ลบไฟล์แล้ว');
  };

  const handleOpenProfileFile = async (file) => {
    try {
      if (file.fileUrl) {
        window.open(file.fileUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      if (!file.fileKey) return;
      const response = await userAPI.getProfileFileDownloadUrl(file.fileKey);
      const url = response?.data?.url || response?.url;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Open profile file error', error);
      toast.error('เปิดไฟล์ไม่สำเร็จ');
    }
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

  const handleUploadSignatureFile = async (file) => {
    try {
      setUploadingSignature(true);
      const response = await userAPI.uploadSignatureFile(file);
      toast.success('Signature uploaded');
      return response?.data || response;
    } catch (error) {
      console.error('Upload signature error', error);
      toast.error(error.response?.data?.message || 'Unable to upload signature');
      return null;
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleSaveSignature = async ({ signatureTitle, signatureImageUrl }) => {
    try {
      setSavingSignature(true);
      const response = await userAPI.updateProfile({ signatureTitle, signatureImageUrl });
      const updatedUser = response?.data || response;
      applyUpdatedUser(updatedUser);
      toast.success('Signature saved');
    } catch (error) {
      console.error('Save signature error', error);
      toast.error(error.response?.data?.message || 'Unable to save signature');
    } finally {
      setSavingSignature(false);
    }
  };

  if (loading) {
    return <Skeleton.List count={5} />;
  }

  return (
    <div className="flex h-full flex-col gap-6 animate-fade-in pb-8 pt-2">
      <ProfileHeader 
        user={user} 
        onUploadProfileImage={handleUploadProfileImage}
        uploadingImage={uploadingProfileImage}
      />

      <ProfileEducationSection
        education={getNormalizedEducation(user?.educationHistory)}
        saving={savingProfileDetails}
        onSave={handleSaveEducation}
      />

      <ProfileFilesSection
        files={getNormalizedProfileFiles(user?.profileFiles)}
        saving={savingProfileDetails}
        uploading={uploadingProfileFile}
        onUpload={handleUploadProfileFile}
        onDelete={handleDeleteProfileFile}
        onOpen={handleOpenProfileFile}
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
        user={user}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={toggleNotifications}
        onShowPasswordModal={() => setShowEditModal(true)}
        onShowPrivacyModal={() => setShowPolicyModal(true)}
        onSaveSignature={handleSaveSignature}
        onUploadSignature={handleUploadSignatureFile}
        savingSignature={savingSignature}
        uploadingSignature={uploadingSignature}
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
        preventClose={isForced}
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
