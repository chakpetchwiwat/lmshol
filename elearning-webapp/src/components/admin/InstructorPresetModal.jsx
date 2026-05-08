import React from 'react';
import { ImagePlus, Loader2, PenLine, PencilLine, Plus, Save, Search, Trash2, Upload, UserRound, X } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';
import { adminAPI, getFullUrl } from '../../utils/api';
import { compressImage } from '../../utils/imageUtils';
import { useToast } from '../../context/useToast';
import SignaturePadModal from '../common/SignaturePadModal';

const getDefaultForm = () => ({
  name: '',
  role: '',
  avatar: '',
  bio: '',
  signatureTitle: '',
  signatureImageUrl: '',
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
  const imageInputRef = React.useRef(null);
  const signatureFileInputRef = React.useRef(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [editingPreset, setEditingPreset] = React.useState(null);
  const [form, setForm] = React.useState(getDefaultForm());
  const [uploading, setUploading] = React.useState(false);
  const [signatureMode, setSignatureMode] = React.useState('upload');
  const [showSignaturePad, setShowSignaturePad] = React.useState(false);

  if (!isOpen) {
    return null;
  }

  const resetForm = () => {
    setEditingPreset(null);
    setForm(getDefaultForm());
    setSignatureMode('upload');
    setShowSignaturePad(false);
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
      signatureTitle: preset.signatureTitle || preset.role || '',
      signatureImageUrl: preset.signatureImageUrl || '',
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

  const handleSignatureUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const response = await adminAPI.uploadSignatureFile(file);
      setForm((current) => ({ ...current, signatureImageUrl: response.data.fileUrl }));
      toast.success('อัปโหลดลายเซ็นเรียบร้อย');
    } catch (error) {
      console.error('Upload instructor signature error:', error);
      toast.error(error.response?.data?.message || 'อัปโหลดลายเซ็นไม่สำเร็จ');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDrawnSignature = async (file) => {
    try {
      setUploading(true);
      const response = await adminAPI.uploadSignatureFile(file);
      setForm((current) => ({ ...current, signatureImageUrl: response.data.fileUrl }));
      toast.success('บันทึกลายเซ็นเข้าแบบฟอร์มแล้ว');
    } catch (error) {
      console.error('Upload instructor signature error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถบันทึกลายเซ็นได้');
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

        <div className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-[0_32px_100px_-32px_rgba(15,23,42,0.55)]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-8 py-6">
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

          <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[1fr_1.1fr]">
             {/* Left Side: Preset List */}
             <div className="flex min-h-0 flex-col border-r border-slate-100 bg-slate-50/30 px-6 py-6">
              <div className="relative mb-6">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="form-input w-full pl-11 shadow-sm border-slate-200"
                  placeholder="ค้นหาชื่อหรือตำแหน่ง..."
                />
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                  <div className="py-20 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredPresets.length === 0 ? (
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 px-4 py-12 text-center text-sm font-bold text-slate-400">
                    ไม่พบข้อมูลวิทยากร
                  </div>
                ) : (
                  filteredPresets.map((preset) => {
                    const isEditing = editingPreset?.id === preset.id;
                    return (
                      <div
                        key={preset.id}
                        className={`group relative flex items-start justify-between gap-4 rounded-3xl border p-4 transition-all ${
                          isEditing
                            ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10'
                            : 'border-white bg-white shadow-sm hover:border-slate-200 hover:shadow-lg'
                        }`}
                      >
                        <div className="flex min-w-0 gap-4">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[1.25rem] bg-slate-100 shadow-inner transition-transform group-hover:scale-105">
                            {preset.avatar ? (
                              <img src={getFullUrl(preset.avatar)} alt={preset.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-300">
                                <UserRound size={24} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 py-0.5">
                            <p className="truncate font-black text-slate-900">{preset.name}</p>
                            <p className="mt-1 text-xs font-bold text-primary">{preset.role || 'ไม่ได้ระบุตำแหน่ง'}</p>
                            {preset.signatureImageUrl && (
                                <div className="mt-2.5">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-black uppercase text-emerald-600 border border-emerald-100">
                                        <PenLine size={10} /> Signature Ready
                                    </span>
                                </div>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button type="button" onClick={() => handleEdit(preset)} className={`btn btn-sm px-4 rounded-xl font-bold transition-all ${isEditing ? 'btn-primary' : 'btn-outline border-slate-200'}`}>
                            {isEditing ? 'แก้ไขอยู่' : 'แก้ไข'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(preset.id, preset.name)}
                            className="btn btn-outline btn-sm h-9 w-9 rounded-xl border-slate-100 p-0 text-slate-400 hover:border-danger/30 hover:bg-danger/5 hover:text-danger transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Side: Form */}
            <div className="flex min-h-0 flex-col bg-white px-8 py-6">
              <form onSubmit={handleSubmit} className="flex h-full flex-col">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                      {editingPreset ? 'Edit Instructor' : 'New Instructor'}
                    </span>
                    <h4 className="mt-1 text-xl font-black text-slate-900">
                      {editingPreset ? 'แก้ไขข้อมูลวิทยากร' : 'เพิ่มวิทยากรใหม่'}
                    </h4>
                  </div>
                  {editingPreset && (
                    <button type="button" onClick={resetForm} className="btn btn-outline btn-sm rounded-xl">
                      ยกเลิกแก้ไข
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto pr-1">
                   <div className="flex items-start gap-6">
                        <div className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-[2rem] border-4 border-slate-50 bg-slate-100 shadow-lg">
                            {form.avatar ? (
                                <img src={getFullUrl(form.avatar)} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-300">
                                    <UserRound size={40} />
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => imageInputRef.current?.click()}
                                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                                <Upload className="text-white mb-1" size={20} />
                                <span className="text-[8px] font-black text-white tracking-widest uppercase">Upload</span>
                            </button>
                            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="space-y-1">
                                <label className="ml-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">ชื่อวิทยากร</label>
                                <input
                                    required
                                    type="text"
                                    className="form-input w-full rounded-2xl border-slate-200"
                                    value={form.name}
                                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                    placeholder="เช่น อาจารย์สมชาย ใจดี"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="ml-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">ตำแหน่งงาน</label>
                                <input
                                    type="text"
                                    className="form-input w-full rounded-2xl border-slate-200"
                                    value={form.role}
                                    onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                                    placeholder="เช่น Head of Education"
                                />
                            </div>
                        </div>
                   </div>

                   <div className="space-y-1">
                        <label className="ml-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">ประวัติ / คำอธิบาย (Bio)</label>
                        <textarea
                            rows={3}
                            className="form-input w-full rounded-2xl border-slate-200 resize-none"
                            value={form.bio}
                            onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                            placeholder="ระบุประวัติย่อของวิทยากร..."
                        />
                   </div>

                   {/* Signature Module */}
                   <div className="rounded-[2rem] border-2 border-slate-100 bg-slate-50/50 p-6 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-900">ลายเซ็นวิทยากร</p>
                          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">สำหรับคอร์สที่วิทยากรลงนาม</p>
                        </div>
                        <div className="flex rounded-xl bg-slate-200/60 p-1">
                          <button
                            type="button"
                            onClick={() => setSignatureMode('upload')}
                            className={`flex h-8 items-center gap-2 rounded-lg px-3 text-[10px] font-black transition-all ${
                              signatureMode === 'upload' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'
                            }`}
                          >
                            <Upload size={12} /> UPLOAD
                          </button>
                          <button
                            type="button"
                            onClick={() => setSignatureMode('draw')}
                            className={`flex h-8 items-center gap-2 rounded-lg px-3 text-[10px] font-black transition-all ${
                              signatureMode === 'draw' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'
                            }`}
                          >
                            <PencilLine size={12} /> DRAW
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="ml-1 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">ตำแหน่งใต้ลายเซ็น</label>
                            <input
                                type="text"
                                className="form-input w-full rounded-xl bg-white text-xs border-slate-200"
                                value={form.signatureTitle}
                                onChange={(event) => setForm((current) => ({ ...current, signatureTitle: event.target.value }))}
                                placeholder="เช่น Instructor, Specialist"
                            />
                        </div>

                        {signatureMode === 'upload' ? (
                            <div className="group relative flex aspect-[10/3] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white transition-all hover:border-primary/50 hover:bg-primary/5">
                            {form.signatureImageUrl ? (
                                <img src={getFullUrl(form.signatureImageUrl)} alt="Preview" className="h-full w-full object-contain p-4" />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-slate-300">
                                <PenLine size={32} />
                                <span className="text-[10px] font-black tracking-widest uppercase">No Signature</span>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => signatureFileInputRef.current?.click()}
                                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 opacity-0 transition-opacity group-hover:opacity-100 rounded-2xl"
                            >
                                <Upload className="text-white mb-2" size={24} />
                                <span className="text-[10px] font-black text-white tracking-widest">CHANGE FILE</span>
                            </button>
                            <input ref={signatureFileInputRef} type="file" accept="image/png,image/webp" className="hidden" onChange={handleSignatureUpload} />
                            </div>
                        ) : (
                            <div className="flex aspect-[10/3] w-full flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
                            {form.signatureImageUrl ? (
                                <div className="relative h-full w-full group">
                                    <img src={getFullUrl(form.signatureImageUrl)} alt="Preview" className="h-full w-full object-contain p-4" />
                                    <button
                                        type="button"
                                        onClick={() => setShowSignaturePad(true)}
                                        className="absolute inset-0 flex flex-col items-center justify-center bg-primary/80 opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                        <PencilLine className="text-white mb-2" size={24} />
                                        <span className="text-[10px] font-black text-white tracking-widest uppercase">Redraw Signature</span>
                                    </button>
                                </div>
                            ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowSignaturePad(true)}
                                        className="flex h-full w-full flex-col items-center justify-center gap-3 transition-colors hover:bg-slate-50"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <PenLine size={20} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Start Drawing</span>
                                    </button>
                            )}
                            </div>
                        )}
                      </div>
                   </div>
                </div>

                <div className="sticky bottom-0 mt-6 flex gap-3 border-t border-slate-100 bg-white pb-1 pt-6">
                  <button 
                    type="submit" 
                    disabled={uploading || loading} 
                    className="flex h-14 flex-1 items-center justify-center gap-3 rounded-2xl bg-primary font-black text-white shadow-xl shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-2xl active:scale-[0.98] disabled:opacity-50"
                  >
                    {uploading ? (
                       <Loader2 className="animate-spin" size={20} />
                    ) : editingPreset ? <Save size={20} /> : <Plus size={20} />}
                    {editingPreset ? 'บันทึกการเปลี่ยนแปลงวิทยากร' : 'เพิ่มข้อมูลวิทยากรใหม่'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <SignaturePadModal
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={handleDrawnSignature}
        initialImageUrl={form.signatureImageUrl ? getFullUrl(form.signatureImageUrl) : null}
        title={`เซ็นชื่อสำหรับวิทยากร: ${form.name || 'วิทยากรใหม่'}`}
      />
    </ModalPortal>
  );
};

export default InstructorPresetModal;
