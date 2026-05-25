import React from 'react';
import { X, Upload, ImageIcon } from 'lucide-react';
import { getFullUrl } from '../../utils/api';
import ModalPortal from '../common/ModalPortal';
import MediaLibraryModal from '../common/MediaLibraryModal';

const RewardModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  isEditing, 
  rewardForm, 
  setRewardForm, 
  onImageUpload, 
  uploadingImage 
}) => {
  const fileInputRef = React.useRef(null);
  const [mediaLibrary, setMediaLibrary] = React.useState({
    isOpen: false,
    allowedTypes: 'all',
    onSelect: null
  });

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
      <div className="card bg-white w-full max-w-md p-0 shadow-xl overflow-hidden rounded-2xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 rounded-t-2xl">
          <h3 className="text-xl font-bold">{isEditing ? 'แก้ไขของรางวัล' : 'เพิ่มของรางวัลใหม่'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors">
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={onSave} className="flex flex-col gap-4">
            {/* Image Upload */}
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-2">รูปภาพของรางวัล</label>
              <div className="flex items-center gap-4">
                {rewardForm.image ? (
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border shrink-0">
                    <img src={getFullUrl(rewardForm.image)} className="w-full h-full object-cover" alt="preview" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                    <ImageIcon size={24} />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={onImageUpload}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-outline py-1.5 px-3 text-sm cursor-pointer whitespace-nowrap flex items-center gap-2"
                      disabled={uploadingImage}
                    >
                      <Upload size={14} /> {uploadingImage ? 'อัปโหลด...' : 'เปลี่ยนรูปภาพ'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaLibrary({
                        isOpen: true,
                        allowedTypes: 'image',
                        onSelect: (file) => setRewardForm({ ...rewardForm, image: file.fileUrl })
                      })}
                      className="btn btn-outline py-1.5 px-3 text-sm cursor-pointer whitespace-nowrap"
                      disabled={uploadingImage}
                    >
                      เลือกจากคลังสื่อ
                    </button>
                    {rewardForm.image && (
                       <button type="button" onClick={() => setRewardForm({...rewardForm, image: ''})} className="text-xs text-red-500 hover:underline">ลบรูป</button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1">ชื่อของรางวัล</label>
              <input
                required
                type="text"
                className="form-input w-full"
                placeholder="เช่น บัตรกำนัล Starbucks"
                value={rewardForm.name}
                onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">แต้มที่ใช้แลก</label>
                <input
                  required
                  type="number"
                  className="form-input w-full font-bold text-warning"
                  value={rewardForm.pointsCost}
                  onChange={(e) => setRewardForm({ ...rewardForm, pointsCost: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">จำนวนคงเหลือ (Stock)</label>
                <input
                  type="number"
                  className="form-input w-full font-bold text-primary"
                  value={rewardForm.stock}
                  onChange={(e) => setRewardForm({ ...rewardForm, stock: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1">จำกัดสิทธิต่อคน (ครั้ง)</label>
              <input
                type="number"
                className="form-input w-full"
                value={rewardForm.maxPerUser}
                min="1"
                onChange={(e) => setRewardForm({ ...rewardForm, maxPerUser: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <button type="button" onClick={onClose} className="btn btn-outline flex-1 py-3">ยกเลิก</button>
              <button type="submit" disabled={uploadingImage} className="btn btn-primary flex-1 py-3 font-bold shadow-lg shadow-primary/20">บันทึก</button>
            </div>
          </form>
        </div>
      </div>
      </div>
      <MediaLibraryModal
        isOpen={mediaLibrary.isOpen}
        allowedTypes={mediaLibrary.allowedTypes}
        onClose={() => setMediaLibrary(prev => ({ ...prev, isOpen: false }))}
        onSelect={mediaLibrary.onSelect}
      />
    </ModalPortal>
  );
};

export default RewardModal;
