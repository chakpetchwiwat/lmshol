import React, { useRef, useState } from 'react';
import { ImagePlus, Plus, Save, Search, Trash2, UserRound, X } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';
import { adminAPI, getFullUrl } from '../../utils/api';
import { compressImage } from '../../utils/imageUtils';
import { useToast } from '../../context/ToastContext';

const getDefaultForm = () => ({
  name: '',
  role: '',
  avatar: '',
  bio: '',
});

const InstructorPresetModal = ({
  isOpen,
  presets,
  loading,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const toast = useToast();
  const imageInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPreset, setEditingPreset] = useState(null);
  const [form, setForm] = useState(getDefaultForm());
  const [uploading, setUploading] = useState(false);

  if (!isOpen) {
    return null;
  }

  const resetForm = () => {
    setEditingPreset(null);
    setForm(getDefaultForm());
  };

  const filteredPresets = Array.isArray(presets)
    ? presets.filter((preset) => {
        const keyword = `${preset.name} ${preset.role || ''}`.toLowerCase();
        return keyword.includes(searchTerm.toLowerCase());
      })
    : [];

  const handleEdit = (preset) => {
    setEditingPreset(preset);
    setForm({
      name: preset.name || '',
      role: preset.role || '',
      avatar: preset.avatar || '',
      bio: preset.bio || '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (editingPreset) {
        await onUpdate(editingPreset.id, form);
      } else {
        await onCreate(form);
      }
      resetForm();
    } catch (error) {
      console.error('Save instructor preset error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลวิทยากรได้');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const compressedFile = await compressImage(file);
      const response = await adminAPI.uploadFile(compressedFile);
      setForm((current) => ({ ...current, avatar: response.data.fileUrl }));
      toast.success('อัปโหลดรูปวิทยากรเรียบร้อย');
    } catch (error) {
      console.error('Upload instructor preset image error:', error);
      toast.error('อัปโหลดรูปวิทยากรไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 backdrop-blur-md">
        <button
          type="button"
          className="absolute inset-0 bg-slate-950/65"
          onClick={() => {
            resetForm();
            onClose();
          }}
          aria-label="ปิดหน้าต่างจัดการวิทยากร"
        />

        <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-[0_32px_100px_-32px_rgba(15,23,42,0.55)]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <h3 className="text-xl font-black text-slate-900">จัดการวิทยากร</h3>
              <p className="mt-1 text-sm text-slate-500">
                บันทึกข้อมูลวิทยากรไว้ล่วงหน้า เพื่อให้เลือกใช้ในคอร์สได้รวดเร็ว
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[1.2fr_0.95fr]">
            <div className="border-r border-slate-100 px-6 py-5">
              <div className="relative mb-5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="form-input w-full pl-10"
                  placeholder="ค้นหาชื่อหรือตำแหน่งวิทยากร..."
                />
              </div>

              <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-1">
                {loading ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                  </div>
                ) : filteredPresets.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    ยังไม่มีข้อมูลวิทยากรที่ตรงกับคำค้น
                  </div>
                ) : (
                  filteredPresets.map((preset) => {
                    const isEditing = editingPreset?.id === preset.id;
                    return (
                      <div
                        key={preset.id}
                        className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-4 transition-all ${
                          isEditing
                            ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
                        }`}
                      >
                        <div className="flex min-w-0 gap-4">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                            {preset.avatar ? (
                              <img src={getFullUrl(preset.avatar)} alt={preset.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <UserRound size={22} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-black text-slate-900">{preset.name}</p>
                            <p className="mt-1 text-sm font-medium text-primary">{preset.role || 'ไม่ได้ระบุตำแหน่ง'}</p>
                            {preset.bio && (
                              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{preset.bio}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button type="button" onClick={() => handleEdit(preset)} className="btn btn-outline btn-sm">
                            {isEditing ? 'กำลังแก้ไข' : 'แก้ไข'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(preset.id, preset.name)}
                            className="btn btn-outline btn-sm border-danger/30 text-danger"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-slate-50/60 px-6 py-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                      {editingPreset ? 'Edit Instructor' : 'New Instructor'}
                    </p>
                    <h4 className="mt-1 text-lg font-black text-slate-900">
                      {editingPreset ? 'แก้ไขข้อมูลวิทยากร' : 'เพิ่มข้อมูลวิทยากร'}
                    </h4>
                  </div>
                  {editingPreset && (
                    <button type="button" onClick={resetForm} className="btn btn-outline btn-sm">
                      ยกเลิกแก้ไข
                    </button>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">ชื่อวิทยากร</label>
                  <input
                    required
                    type="text"
                    className="form-input w-full"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="เช่น อาจารย์สมชาย ใจดี"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">ตำแหน่ง</label>
                  <input
                    type="text"
                    className="form-input w-full"
                    value={form.role}
                    onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                    placeholder="เช่น Head of Learning Experience"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">รูปวิทยากร</label>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="form-input flex-1"
                      value={form.avatar}
                      onChange={(event) => setForm((current) => ({ ...current, avatar: event.target.value }))}
                      placeholder="URL รูป หรืออัปโหลดไฟล์"
                    />
                    <button type="button" onClick={() => imageInputRef.current?.click()} className="btn btn-outline btn-sm gap-1" disabled={uploading}>
                      <ImagePlus size={14} />
                      อัปโหลด
                    </button>
                  </div>
                  {form.avatar && (
                    <div className="mt-3 h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <img src={getFullUrl(form.avatar)} alt="Instructor avatar preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">ประวัติ / คำอธิบาย</label>
                  <textarea
                    rows={5}
                    className="form-input w-full resize-none"
                    value={form.bio}
                    onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                    placeholder="ใส่คำอธิบายสั้น ๆ ของวิทยากร"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn btn-primary flex-1 gap-2">
                    {editingPreset ? <Save size={16} /> : <Plus size={16} />}
                    {editingPreset ? 'บันทึกการแก้ไข' : 'เพิ่มวิทยากร'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default InstructorPresetModal;
