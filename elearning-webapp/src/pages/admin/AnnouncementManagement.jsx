import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const isFullAdmin = canEditAdminUsers(user);

  const [announcements, setAnnouncements] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editorImageUploading, setEditorImageUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState(ENTITY_VIEW_STATUS.ACTIVE);
  const [form, setForm] = useState(getDefaultForm());

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentAnnouncementTitle, setCurrentAnnouncementTitle] = useState('');

  const announcementHistoryCacheRef = useRef(new Map());
  const announcementHistoryRequestRef = useRef(null);

  const invalidateAnnouncementHistoryCache = useCallback((announcementId) => {
    if (!announcementId) {
      announcementHistoryCacheRef.current.clear();
      return;
    }

    announcementHistoryCacheRef.current.delete(announcementId);
  }, []);

  const cancelAnnouncementHistoryRequest = useCallback(() => {
    if (announcementHistoryRequestRef.current) {
      announcementHistoryRequestRef.current.abort();
      announcementHistoryRequestRef.current = null;
    }
  }, []);

  const fetchData = useCallback(async () => {
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
      toast.error('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเธเธฃเธฐเธเธฒเธจเนเธ”เน');
    } finally {
      setLoading(false);
    }
  }, [isFullAdmin, toast, user?.departmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => () => {
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
      toast.success('เธญเธฑเธเนเธซเธฅเธ”เธ เธฒเธเธเธฃเธฐเธเธฒเธจเน€เธฃเธตเธขเธเธฃเนเธญเธข');
    } catch (error) {
      console.error('Upload announcement image error:', error);
      toast.error('เธญเธฑเธเนเธซเธฅเธ”เธ เธฒเธเนเธกเนเธชเธณเน€เธฃเนเธ');
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
      toast.success('เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเนเน€เธเธทเนเธญเธซเธฒเธเธฃเธฐเธเธฒเธจเน€เธฃเธตเธขเธเธฃเนเธญเธข');
    } catch (error) {
      console.error('Upload announcement document error:', error);
      toast.error('เธญเธฑเธเนเธซเธฅเธ”เนเธเธฅเนเนเธกเนเธชเธณเน€เธฃเนเธ');
    } finally {
      setUploading(false);
    }
  };

  const handleEditorImageUpload = async (file) => {
    if (!file?.type?.startsWith('image/')) {
      toast.error('เธฃเธญเธเธฃเธฑเธเน€เธเธเธฒเธฐเนเธเธฅเนเธฃเธนเธเธ เธฒเธ');
      return '';
    }

    try {
      setEditorImageUploading(true);
      const compressedFile = await compressImage(file);
      const response = await adminAPI.uploadFile(compressedFile);
      return response.data.fileUrl;
    } catch (error) {
      console.error('Upload announcement editor image error:', error);
      toast.error('เธญเธฑเธเนเธซเธฅเธ”เธฃเธนเธเนเธเน€เธเธทเนเธญเธซเธฒเนเธกเนเธชเธณเน€เธฃเนเธ');
      return '';
    } finally {
      setEditorImageUploading(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!form.expiredAt) {
      toast.error('เธเธฃเธธเธ“เธฒเธเธณเธซเธเธ”เธงเธฑเธเธซเธกเธ”เธญเธฒเธขเธธเธเธญเธเธเธฃเธฐเธเธฒเธจ');
      return;
    }

    if (form.scope === 'DEPARTMENT' && !form.departmentId) {
      toast.error('เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเนเธเธเธ');
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
        toast.success('เธญเธฑเธเน€เธ”เธ•เธเธฃเธฐเธเธฒเธจเน€เธฃเธตเธขเธเธฃเนเธญเธข');
      } else {
        await adminAPI.createAnnouncement(payload);
        toast.success('เธชเธฃเนเธฒเธเธเธฃเธฐเธเธฒเธจเน€เธฃเธตเธขเธเธฃเนเธญเธข');
      }

      setShowModal(false);
      resetForm();
      await fetchData();
    } catch (error) {
      console.error('Save announcement error:', error);
      toast.error(error.response?.data?.message || 'เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธเธฑเธเธ—เธถเธเธเธฃเธฐเธเธฒเธจเนเธ”เน');
    }
  };

  const handleArchive = async (announcement) => {
    const ok = await confirm({
      title: 'เธ•เนเธญเธเธเธฒเธฃเน€เธเนเธเธเธฃเธฐเธเธฒเธจเน€เธเนเธฒเธเธฅเธฑเธ?',
      message: `เธเธฃเธฐเธเธฒเธจ "${announcement.title}" เธเธฐเธซเธกเธ”เธญเธฒเธขเธธเธ—เธฑเธเธ—เธตเนเธฅเธฐเธ–เธนเธเธขเนเธฒเธขเนเธเธขเธฑเธเนเธ—เนเธ "เธซเธกเธ”เธญเธฒเธขเธธเนเธฅเนเธง" เธเธธเธ“เธ•เนเธญเธเธเธฒเธฃเธ”เธณเน€เธเธดเธเธเธฒเธฃเธ•เนเธญเนเธเนเธซเธฃเธทเธญเนเธกเน?`,
      confirmLabel: 'เน€เธเนเธเน€เธเนเธฒเธเธฅเธฑเธ',
      variant: 'warning',
    });

    if (!ok) return;

    try {
      await adminAPI.archiveAnnouncement(announcement.id);
      invalidateAnnouncementHistoryCache(announcement.id);
      toast.success('เน€เธเนเธเธเธฃเธฐเธเธฒเธจเน€เธเนเธฒเธเธฅเธฑเธเน€เธฃเธตเธขเธเธฃเนเธญเธข');
      await fetchData();
    } catch (error) {
      console.error('Archive announcement error:', error);
      toast.error('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เน€เธเนเธเธเธฃเธฐเธเธฒเธจเน€เธเนเธฒเธเธฅเธฑเธเนเธ”เน');
    }
  };

  const handleRepublish = async (announcement) => {
    const ok = await confirm({
      title: 'เธ•เนเธญเธเธเธฒเธฃเธเธณเธเธฃเธฐเธเธฒเธจเธเธฅเธฑเธเธกเธฒเนเธเนเธเธฒเธ?',
      message: `เธเธฃเธฐเธเธฒเธจ "${announcement.title}" เธเธฐเธ–เธนเธเธขเนเธฒเธขเธเธฅเธฑเธเนเธเธขเธฑเธเนเธ—เนเธ "เธเธฃเธฐเธเธฒเธจเธ—เธตเนเธขเธฑเธเนเธเนเธเธฒเธ" เธเธธเธ“เธ•เนเธญเธเธเธฒเธฃเธ”เธณเน€เธเธดเธเธเธฒเธฃเธ•เนเธญเนเธเนเธซเธฃเธทเธญเนเธกเน?`,
      confirmLabel: 'เธเธณเธเธฅเธฑเธเธกเธฒเนเธเนเธเธฒเธ',
      variant: 'primary',
    });

    if (!ok) return;

    try {
      await adminAPI.republishAnnouncement(announcement.id);
      invalidateAnnouncementHistoryCache(announcement.id);
      toast.success('เธเธณเธเธฃเธฐเธเธฒเธจเธเธฅเธฑเธเธกเธฒเนเธเนเธเธฒเธเน€เธฃเธตเธขเธเธฃเนเธญเธข');
      await fetchData();
    } catch (error) {
      console.error('Republish announcement error:', error);
      toast.error('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธเธณเธเธฃเธฐเธเธฒเธจเธเธฅเธฑเธเธกเธฒเนเธเนเธเธฒเธเนเธ”เน');
    }
  };

  const handleDelete = async (announcement) => {
    const ok = await confirm({
      title: 'เธขเธทเธเธขเธฑเธเธเธฒเธฃเธฅเธเธเธฃเธฐเธเธฒเธจ',
      message: `เธเธธเธ“เธ•เนเธญเธเธเธฒเธฃเธฅเธเธเธฃเธฐเธเธฒเธจ "${announcement.title}" เนเธเนเธซเธฃเธทเธญเนเธกเน? เธเธฒเธฃเธ”เธณเน€เธเธดเธเธเธฒเธฃเธเธตเนเนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธขเนเธญเธเธเธฅเธฑเธเนเธ”เน`,
      confirmLabel: 'เธฅเธ',
      variant: 'danger',
    });

    if (!ok) return;

    try {
      await adminAPI.deleteAnnouncement(announcement.id);
      invalidateAnnouncementHistoryCache(announcement.id);
      toast.success('เธฅเธเธเธฃเธฐเธเธฒเธจเน€เธฃเธตเธขเธเธฃเนเธญเธข');
      await fetchData();
    } catch (error) {
      console.error('Delete announcement error:', error);
      toast.error('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธฅเธเธเธฃเธฐเธเธฒเธจเนเธ”เน');
    }
  };

  const handleCloseHistoryModal = useCallback(() => {
    cancelAnnouncementHistoryRequest();
    setShowHistoryModal(false);
    setHistoryLoading(false);
  }, [cancelAnnouncementHistoryRequest]);

  const handleViewHistory = useCallback(async (announcement) => {
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
      toast.error('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเธเธฃเธฐเธงเธฑเธ•เธดเนเธ”เน');
      setHistoryData([]);
    } finally {
      if (announcementHistoryRequestRef.current === controller) {
        announcementHistoryRequestRef.current = null;
        setHistoryLoading(false);
      }
    }
  }, [cancelAnnouncementHistoryRequest, toast]);

  const filteredAnnouncements = useMemo(() => {
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

  const activeCount = useMemo(
    () => announcements.filter((announcement) => {
      if (!isFullAdmin && announcement.scope !== 'GLOBAL' && announcement.departmentId !== user?.departmentId) return false;
      return !announcement.expiredAt || new Date(announcement.expiredAt) > new Date();
    }).length,
    [announcements, isFullAdmin, user?.departmentId],
  );

  const archivedCount = useMemo(
    () => announcements.filter((announcement) => {
      if (!isFullAdmin && announcement.scope !== 'GLOBAL' && announcement.departmentId !== user?.departmentId) return false;
      return announcement.expiredAt && new Date(announcement.expiredAt) <= new Date();
    }).length,
    [announcements, isFullAdmin, user?.departmentId],
  );

  const columns = [
    { label: 'เธเธฃเธฐเธเธฒเธจ' },
    { label: 'เนเธเธเธ', className: 'min-w-[140px]' },
    { label: 'เธเธเธดเธ”เธซเธเนเธฒ', className: 'min-w-[120px]' },
    { label: 'เธซเธกเธ”เธญเธฒเธขเธธ', className: 'min-w-[180px]' },
    { label: 'เธเธฑเธ”เธเธฒเธฃ', className: 'w-[100px] text-center' },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <AdminPageHeader
        title="เธเธฑเธ”เธเธฒเธฃเธเธฃเธฐเธเธฒเธจเนเธเธเธ"
        subtitle={isFullAdmin ? 'เธชเธฃเนเธฒเธเนเธฅเธฐเธ”เธนเธเธฃเธฐเธเธฒเธจเนเธ”เนเธ—เธธเธเนเธเธเธ' : `เธ”เธนเนเธฅเธเธฃเธฐเธเธฒเธจเธชเธณเธซเธฃเธฑเธเนเธเธเธ ${user?.department || 'เธเธญเธเธเธธเธ“'}`}
        actions={(
          <button type="button" onClick={openCreateModal} className="btn btn-primary gap-2">
            <BellPlus size={18} />
            เธชเธฃเนเธฒเธเธเธฃเธฐเธเธฒเธจ
          </button>
        )}
      />

      <div className="space-y-6">
        <ViewToggleTabs
          viewMode={viewMode}
          setViewMode={setViewMode}
          tabs={[
            { key: ENTITY_VIEW_STATUS.ACTIVE, label: `เธเธฃเธฐเธเธฒเธจเธ—เธตเนเธขเธฑเธเนเธเนเธเธฒเธ (${activeCount})`, icon: CalendarClock },
            { key: ENTITY_VIEW_STATUS.ARCHIVED, label: `เธซเธกเธ”เธญเธฒเธขเธธเนเธฅเนเธง (${archivedCount})`, icon: CalendarClock },
          ]}
        />

        <div className="card">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input
                type="text"
                className="w-full rounded-md border border-border bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
                placeholder="เธเนเธเธซเธฒเธเธทเนเธญเธเธฃเธฐเธเธฒเธจเธซเธฃเธทเธญเนเธเธเธ..."
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
