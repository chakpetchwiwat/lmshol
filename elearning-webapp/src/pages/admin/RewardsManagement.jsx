import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, ImageIcon } from 'lucide-react';
import { adminAPI, getFullUrl } from '../../utils/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Skeleton from '../../components/common/Skeleton';
import RewardModal from '../../components/admin/RewardModal';
import { isSuperAdmin } from '../../utils/roles';
import { useToast } from '../../context/useToast';
import useConfirm from '../../hooks/useConfirm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { REWARD_STATUS } from '../../utils/constants/statuses';

const DEFAULT_REWARD_FORM = {
  name: '',
  pointsCost: 100,
  stock: 10,
  maxPerUser: 1,
  image: '',
};

const RewardsManagement = () => {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [rewardForm, setRewardForm] = useState(DEFAULT_REWARD_FORM);
  const [uploadingImage, setUploadingImage] = useState(false);
  const toast = useToast();
  const { confirm, ConfirmDialogProps } = useConfirm();

  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const response = await adminAPI.getRewards();
        setRewards(response.data);
      } catch (error) {
        console.error('Fetch rewards error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
  }, []);

  const refreshRewards = async () => {
    try {
      const response = await adminAPI.getRewards();
      setRewards(response.data);
    } catch (error) {
      console.error('Fetch rewards error:', error);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setEditingId(null);
    setRewardForm(DEFAULT_REWARD_FORM);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const response = await adminAPI.uploadFile(file);
      setRewardForm((currentForm) => ({ ...currentForm, image: response.data.fileUrl }));
    } catch (error) {
      console.error(error);
      toast.error('อัปโหลดรูปภาพไม่สำเร็จ');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (isEditing) {
        await adminAPI.updateReward(editingId, { ...rewardForm });
        toast.success('อัปเดตรางวัลสำเร็จ');
      } else {
        await adminAPI.createReward({ ...rewardForm, status: REWARD_STATUS.ACTIVE });
        toast.success('เพิ่มรางวัลสำเร็จ');
      }

      closeModal();
      await refreshRewards();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const openEdit = (reward) => {
    setIsEditing(true);
    setEditingId(reward.id);
    setRewardForm({
      name: reward.name,
      pointsCost: reward.pointsCost,
      stock: reward.stock,
      maxPerUser: reward.maxPerUser || 1,
      image: reward.image || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'ยืนยันการลบรางวัล',
      message: 'ยืนยันการลบรางวัลนี้? การลบนี้จะไม่สามารถย้อนคืนได้',
      confirmLabel: 'ลบรางวัล',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await adminAPI.deleteReward(id);
      toast.success('ลบรางวัลสำเร็จ');
      setRewards((currentRewards) => currentRewards.filter((reward) => reward.id !== id));
    } catch (error) {
      console.error(error);
      toast.error('ลบไม่สำเร็จ');
    }
  };

  if (!isSuperAdmin(currentUser)) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-12 text-center">
        <div className="mb-4 rounded-2xl bg-danger-bg p-4 text-danger">
          <Plus size={48} className="rotate-45" />
        </div>
        <h2 className="mb-2 text-2xl font-black">เข้าถึงไม่ได้</h2>
        <p className="max-w-md text-muted">คุณไม่มีสิทธิ์ในการจัดการของรางวัลในระบบ กรุณาติดต่อ Superadmin</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="จัดการของรางวัล"
        subtitle="จัดการรายการของรางวัลในระบบเพื่อจูงใจพนักงาน"
        actions={
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={18} /> เพิ่มของรางวัล
          </button>
        }
      />

      <RewardModal
        isOpen={showModal}
        onClose={closeModal}
        onSave={handleSubmit}
        isEditing={isEditing}
        rewardForm={rewardForm}
        setRewardForm={setRewardForm}
        onImageUpload={handleImageUpload}
        uploadingImage={uploadingImage}
      />

      <div className="mb-2 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <Skeleton.List count={4} />
        ) : rewards.length === 0 ? (
          <div className="col-span-full rounded-2xl border-2 border-dashed border-border bg-gray-50/50 p-12 text-center text-muted">
            ยังไม่มีของรางวัลในระบบ
          </div>
        ) : rewards.map((reward) => (
          <div
            key={reward.id}
            className={`card group p-5 transition-all hover:border-primary/20 hover:shadow-lg ${
              reward.stock === 0 ? 'bg-gray-50' : 'bg-surface'
            }`}
          >
            <div className="mb-4 flex items-start justify-between">
              <span className={`badge text-[10px] font-black uppercase tracking-wider ${reward.stock > 0 ? 'badge-success' : 'bg-gray-200 text-gray-700'}`}>
                {reward.stock > 0 ? 'Active' : 'หมดสต็อก'}
              </span>
              <div className="flex gap-1 text-muted opacity-0 transition-opacity group-hover:opacity-100">
                <button onClick={() => openEdit(reward)} className="rounded p-1.5 text-primary hover:bg-white">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(reward.id)} className="rounded p-1.5 text-danger hover:bg-white">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-4">
              {reward.image ? (
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-100">
                  <img src={getFullUrl(reward.image)} alt="Reward" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary-light">
                  <ImageIcon size={24} className="text-primary/60" />
                </div>
              )}
              <h3 className="text-base font-bold leading-tight">{reward.name}</h3>
            </div>

            <div className="mt-4 flex items-end justify-between border-t border-border/50 pt-4">
              <div>
                <p className="mb-0.5 text-[10px] font-black uppercase tracking-wide text-muted">แต้มที่ใช้</p>
                <p className="text-lg font-black leading-none text-warning">
                  {reward.pointsCost} <span className="text-[10px]">PTS</span>
                </p>
              </div>
              <div className="text-right">
                <p className="mb-0.5 text-[10px] font-black uppercase tracking-wide text-muted">คงเหลือ</p>
                <p className={`text-lg font-black leading-none ${reward.stock === 0 ? 'text-danger' : 'text-primary'}`}>
                  {reward.stock}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog {...ConfirmDialogProps} />
    </div>
  );
};

export default RewardsManagement;
