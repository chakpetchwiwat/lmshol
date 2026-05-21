import React from 'react';
import { BellPlus, CalendarClock, Search } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import { useToast } from '../../context/useToast';
import { compressImage } from '../../utils/imageUtils';
import { canEditAdminUsers } from '../../utils/roles';
import useConfirm from '../../hooks/useConfirm';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { ENTITY_VIEW_STATUS } from '../../utils/constants/statuses';
import ViewToggleTabs from '../../components/common/ViewToggleTabs';

import AnnouncementTable from '../../components/admin/AnnouncementTable';
import AnnouncementModal from '../../components/admin/AnnouncementModal';
import AnnouncementHistoryModal from '../../components/admin/AnnouncementHistoryModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const getDefaultForm = (departmentId = '') => ({
  title: '',
  description: '',
  image: '',
  departmentId,
  scope: 'DEPARTMENT',
  type: 'article',
  contentUrl: '',
  content: '',
  duration: 0,
  passScore: 60,
  questions: [],
  expiredAt: '',
});

const isCanceledRequest = (error) => error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError';

const AnnouncementManagement = () => {
  const toast = useToast();
  const { confirm, ConfirmDialogProps } = useConfirm();

  const [user] = React.useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const isFullAdmin = canEditAdminUsers(user);

  const [announcements, setAnnouncements] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [editorImageUploading, setEditorImageUploading] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [viewMode, setViewMode] = React.useState(ENTITY_VIEW_STATUS.ACTIVE);
  const [form, setForm] = React.useState(getDefaultForm());

  const [showHistoryModal, setShowHistoryModal] = React.useState(false);
  const [historyData, setHistoryData] = React.useState([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [currentAnnouncementTitle, setCurrentAnnouncementTitle] = React.useState('');

  const announcementHistoryCacheRef = React.useRef(new Map());
  const announcementHistoryRequestRef = React.useRef(null);

  const invalidateAnnouncementHistoryCache = React.useCallback((announcementId) => {
    if (!announcementId) {
      announcementHistoryCacheRef.current.clear();
      return;
    }

    announcementHistoryCacheRef.current.delete(announcementId);
  }, []);

  const cancelAnnouncementHistoryRequest = React.useCallback(() => {
    if (announcementHistoryRequestRef.current) {
      announcementHistoryRequestRef.current.abort();
      announcementHistoryRequestRef.current = null;
    }
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [announcementRes, departmentRes] = await Promise.all([
        adminAPI.getAnnouncements(),
        adminAPI.getDepartments(),
      ]);

      const nextAnnouncements = Array.isArray(announcementRes?.data) ? announcementRes.data : [];
      const nextDepartments = Array.isArray(departmentRes?.data) ? departmentRes.data : [];

      setAnnouncements(nextAnnouncements);
      setDepartments(nextDepartments);

      setForm((current) => {
        if (current.departmentId) return current;
        if (!nextDepartments.length) return current;
        return { ...current, departmentId: isFullAdmin ? nextDepartments[0].id : user?.departmentId };
      });
    } catch (error) {
      console.error('Fetch announcement data error:', error);
      toast.error('ไม่สามารถโหลดข้อมูลประกาศได้');
    } finally {
      setLoading(false);
    }
  }, [isFullAdmin, toast, user?.departmentId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => () => {
    cancelAnnouncementHistoryRequest();
  }, [cancelAnnouncementHistoryRequest]);

  const resetForm = () => {
    setEditingAnnouncement(null);
    setForm(getDefaultForm(isFullAdmin ? (departments[0]?.id || '') : user?.departmentId));
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (announcement) => {
    setEditingAnnouncement(announcement);
    setForm({
      title: announcement.title || '',
      description: announcement.description || '',
      image: announcement.image || '',
      departmentId: announcement.departmentId || (isFullAdmin ? (departments[0]?.id || '') : user?.departmentId) || '',
      type: announcement.type || 'article',
      contentUrl: announcement.contentUrl || '',
      content: announcement.content || '',
      duration: Number(announcement.duration) || 0,
      passScore: announcement.passScore || 60,
      questions: announcement.questions || [],
      expiredAt: announcement.expiredAt || '',
      scope: announcement.scope || 'DEPARTMENT',
    });

    setShowModal(true);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const compressedFile = await compressImage(file);
      const response = await adminAPI.uploadFile(compressedFile);
      setForm((current) => ({ ...current, image: response.data.fileUrl }));
      toast.success('อัปโหลดภาพประกาศเรียบร้อย');
    } catch (error) {
      console.error('Upload announcement image error:', error);
      toast.error('อัปโหลดภาพไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  const handleDocUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const compressedFile = file.type.startsWith('image/') ? await compressImage(file) : file;
      const response = await adminAPI.uploadFile(compressedFile);
      setForm((current) => ({ ...current, contentUrl: response.data.fileUrl }));
      toast.success('อัปโหลดไฟล์เนื้อหาประกาศเรียบร้อย');
    } catch (error) {
      console.error('Upload announcement document error:', error);
      toast.error('อัปโหลดไฟล์ไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  const handleEditorImageUpload = async (file) => {
    if (!file?.type?.startsWith('image/')) {
      toast.error('รองรับเฉพาะไฟล์รูปภาพ');
      return '';
    }

    try {
      setEditorImageUploading(true);
      const compressedFile = await compressImage(file);
      const response = await adminAPI.uploadFile(compressedFile);
      return response.data.fileUrl;
    } catch (error) {
      console.error('Upload announcement editor image error:', error);
      toast.error('อัปโหลดรูปในเนื้อหาไม่สำเร็จ');
      return '';
    } finally {
      setEditorImageUploading(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!form.expiredAt) {
      toast.error('กรุณากำหนดวันหมดอายุของประกาศ');
      return;
    }

    if (form.scope === 'DEPARTMENT' && !form.departmentId) {
      toast.error('กรุณาเลือกแผนก');
      return;
    }

    try {
      const payload = {
        ...form,
        duration: Number(form.duration) || 0,
        passScore: Number(form.passScore) || 60,
        departmentId: form.scope === 'GLOBAL' ? null : form.departmentId,
      };

      if (editingAnnouncement) {
        await adminAPI.updateAnnouncement(editingAnnouncement.id, payload);
        invalidateAnnouncementHistoryCache(editingAnnouncement.id);
        toast.success('อัปเดตประกาศเรียบร้อย');
      } else {
        await adminAPI.createAnnouncement(payload);
        toast.success('สร้างประกาศเรียบร้อย');
      }

      setShowModal(false);
      resetForm();
      await fetchData();
    } catch (error) {
      console.error('Save announcement error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถบันทึกประกาศได้');
    }
  };

  const handleArchive = async (announcement) => {
    const ok = await confirm({
      title: 'ต้องการเก็บประกาศเข้าคลัง?',
      message: `ประกาศ "${announcement.title}" จะหมดอายุทันทีและถูกย้ายไปยังแท็บ "หมดอายุแล้ว" คุณต้องการดำเนินการต่อใช่หรือไม่?`,
      confirmLabel: 'เก็บเข้าคลัง',
      variant: 'warning',
    });

    if (!ok) return;

    try {
      await adminAPI.archiveAnnouncement(announcement.id);
      invalidateAnnouncementHistoryCache(announcement.id);
      toast.success('เก็บประกาศเข้าคลังเรียบร้อย');
      await fetchData();
    } catch (error) {
      console.error('Archive announcement error:', error);
      toast.error('ไม่สามารถเก็บประกาศเข้าคลังได้');
    }
  };

  const handleRepublish = async (announcement) => {
    const ok = await confirm({
      title: 'ต้องการนำประกาศกลับมาใช้งาน?',
      message: `ประกาศ "${announcement.title}" จะถูกย้ายกลับไปยังแท็บ "ประกาศที่ยังใช้งาน" คุณต้องการดำเนินการต่อใช่หรือไม่?`,
      confirmLabel: 'นำกลับมาใช้งาน',
      variant: 'primary',
    });

    if (!ok) return;

    try {
      await adminAPI.republishAnnouncement(announcement.id);
      invalidateAnnouncementHistoryCache(announcement.id);
      toast.success('นำประกาศกลับมาใช้งานเรียบร้อย');
      await fetchData();
    } catch (error) {
      console.error('Republish announcement error:', error);
      toast.error('ไม่สามารถนำประกาศกลับมาใช้งานได้');
    }
  };

  const handleDelete = async (announcement) => {
    const ok = await confirm({
      title: 'ยืนยันการลบประกาศ',
      message: `คุณต้องการลบประกาศ "${announcement.title}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
      confirmLabel: 'ลบ',
      variant: 'danger',
    });

    if (!ok) return;

    try {
      await adminAPI.deleteAnnouncement(announcement.id);
      invalidateAnnouncementHistoryCache(announcement.id);
      toast.success('ลบประกาศเรียบร้อย');
      await fetchData();
    } catch (error) {
      console.error('Delete announcement error:', error);
      toast.error('ไม่สามารถลบประกาศได้');
    }
  };

  const handleCloseHistoryModal = React.useCallback(() => {
    cancelAnnouncementHistoryRequest();
    setShowHistoryModal(false);
    setHistoryLoading(false);
  }, [cancelAnnouncementHistoryRequest]);

  const handleViewHistory = React.useCallback(async (announcement) => {
    const announcementId = announcement?.id;
    if (!announcementId) return;

    setCurrentAnnouncementTitle(announcement.title);
    setShowHistoryModal(true);

    const cachedHistory = announcementHistoryCacheRef.current.get(announcementId);
    if (cachedHistory) {
      setHistoryData(cachedHistory);
      setHistoryLoading(false);
      return;
    }

    cancelAnnouncementHistoryRequest();

    const controller = new AbortController();
    announcementHistoryRequestRef.current = controller;
    setHistoryLoading(true);

    try {
      const response = await adminAPI.getAnnouncementHistory(announcementId, {
        signal: controller.signal,
      });

      if (announcementHistoryRequestRef.current !== controller) {
        return;
      }

      const nextHistory = Array.isArray(response?.data) ? response.data : [];
      announcementHistoryCacheRef.current.set(announcementId, nextHistory);
      setHistoryData(nextHistory);
    } catch (error) {
      if (isCanceledRequest(error)) {
        return;
      }

      console.error('View history error:', error);
      toast.error('ไม่สามารถโหลดข้อมูลประวัติได้');
      setHistoryData([]);
    } finally {
      if (announcementHistoryRequestRef.current === controller) {
        announcementHistoryRequestRef.current = null;
        setHistoryLoading(false);
      }
    }
  }, [cancelAnnouncementHistoryRequest, toast]);

  const filteredAnnouncements = React.useMemo(() => {
    const now = new Date();
    return announcements.filter((announcement) => {
      if (!isFullAdmin && announcement.scope !== 'GLOBAL' && announcement.departmentId !== user?.departmentId) {
        return false;
      }

      const isArchived = announcement.expiredAt ? new Date(announcement.expiredAt) <= now : false;
      const matchesView = viewMode === ENTITY_VIEW_STATUS.ARCHIVED ? isArchived : !isArchived;
      const keyword = `${announcement.title} ${announcement.department?.name || ''}`.toLowerCase();
      const matchesSearch = keyword.includes(searchTerm.toLowerCase());

      return matchesView && matchesSearch;
    });
  }, [announcements, searchTerm, viewMode, isFullAdmin, user?.departmentId]);

  const activeCount = React.useMemo(
    () => announcements.filter((announcement) => {
      if (!isFullAdmin && announcement.scope !== 'GLOBAL' && announcement.departmentId !== user?.departmentId) return false;
      return !announcement.expiredAt || new Date(announcement.expiredAt) > new Date();
    }).length,
    [announcements, isFullAdmin, user?.departmentId],
  );

  const archivedCount = React.useMemo(
    () => announcements.filter((announcement) => {
      if (!isFullAdmin && announcement.scope !== 'GLOBAL' && announcement.departmentId !== user?.departmentId) return false;
      return announcement.expiredAt && new Date(announcement.expiredAt) <= new Date();
    }).length,
    [announcements, isFullAdmin, user?.departmentId],
  );

  const columns = [
    { label: 'ประกาศ' },
    { label: 'แผนก', className: 'min-w-[140px]' },
    { label: 'ชนิดหน้า', className: 'min-w-[120px]' },
    { label: 'หมดอายุ', className: 'min-w-[180px]' },
    { label: 'จัดการ', className: 'w-[100px] text-center' },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <AdminPageHeader
        title="จัดการประกาศแผนก"
        subtitle={isFullAdmin ? 'สร้างและดูประกาศได้ทุกแผนก' : `ดูแลประกาศสำหรับแผนก ${user?.department || 'ของคุณ'}`}
        actions={(
          <button type="button" onClick={openCreateModal} className="btn btn-primary gap-2">
            <BellPlus size={18} />
            สร้างประกาศ
          </button>
        )}
      />

      <div className="space-y-6">
        <ViewToggleTabs
          viewMode={viewMode}
          setViewMode={setViewMode}
          tabs={[
            { key: ENTITY_VIEW_STATUS.ACTIVE, label: `ประกาศที่ยังใช้งาน (${activeCount})`, icon: CalendarClock },
            { key: ENTITY_VIEW_STATUS.ARCHIVED, label: `หมดอายุแล้ว (${archivedCount})`, icon: CalendarClock },
          ]}
        />

        <div className="card">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input
                type="text"
                className="w-full rounded-md border border-border bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
                placeholder="ค้นหาชื่อประกาศหรือแผนก..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>
        </div>

        <AnnouncementTable
          data={filteredAnnouncements}
          columns={columns}
          loading={loading}
          viewMode={viewMode}
          onViewHistory={handleViewHistory}
          onEdit={openEditModal}
          onArchive={handleArchive}
          onRepublish={handleRepublish}
          onDelete={handleDelete}
        />
      </div>

      <AnnouncementModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isEditing={!!editingAnnouncement}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        onImageUpload={handleImageUpload}
        onDocUpload={handleDocUpload}
        onEditorImageUpload={handleEditorImageUpload}
        isFullAdmin={isFullAdmin}
        user={user}
        departments={departments}
        uploading={uploading}
        editorImageUploading={editorImageUploading}
      />

      <AnnouncementHistoryModal
        isOpen={showHistoryModal}
        onClose={handleCloseHistoryModal}
        title={currentAnnouncementTitle}
        loading={historyLoading}
        historyData={historyData}
      />

      <ConfirmDialog {...ConfirmDialogProps} />
    </div>
  );
};

export default AnnouncementManagement;
