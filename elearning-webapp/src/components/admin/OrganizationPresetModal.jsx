import React from 'react';
import { Building2, ImagePlus, PenLine, PencilLine, Plus, Save, Search, ShieldCheck, Trash2, Upload, X } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';
import { adminAPI, getFullUrl } from '../../utils/api';
import { useToast } from '../../context/useToast';
import SignaturePadModal from '../common/SignaturePadModal';
import SignatureImage from '../common/SignatureImage';
import MediaLibraryModal from '../common/MediaLibraryModal';

const getDefaultForm = () => ({
  name: '',
  signatureTitle: '',
  signatureImageUrl: '',
  stampImageUrl: '',
});

const OrganizationPresetModal = ({
  isOpen,
  presets = [],
  loading,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [editingPreset, setEditingPreset] = React.useState(null);
  const [form, setForm] = React.useState(getDefaultForm());
  const [uploading, setUploading] = React.useState(false);
  const [signatureMode, setSignatureMode] = React.useState('upload');
  const [showSignaturePad, setShowSignaturePad] = React.useState(false);
  const [signaturePreviewUrl, setSignaturePreviewUrl] = React.useState('');
  const stampFileInputRef = React.useRef(null);
  const signatureFileInputRef = React.useRef(null);
  const [mediaLibrary, setMediaLibrary] = React.useState({
    isOpen: false,
    allowedTypes: 'all',
    onSelect: null
  });

  if (!isOpen) {
    return null;
  }

  const resetForm = () => {
    setEditingPreset(null);
    setForm(getDefaultForm());
    setSignatureMode('upload');
    setShowSignaturePad(false);
    setSignaturePreviewUrl('');
  };

  const filteredPresets = Array.isArray(presets)
    ? presets.filter((preset) => {
        const keyword = `${preset.name} ${preset.signatureTitle || ''}`.toLowerCase();
        return keyword.includes(searchTerm.toLowerCase());
      })
    : [];

  const handleEdit = (preset) => {
    setEditingPreset(preset);
    setForm({
      name: preset.name || '',
      signatureTitle: preset.signatureTitle || '',
      signatureImageUrl: preset.signatureImageUrl || '',
      stampImageUrl: preset.stampImageUrl || '',
    });
    setSignaturePreviewUrl('');
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
      console.error('Save organization preset error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลหน่วยงานได้');
    }
  };

  const handleStampUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const response = await adminAPI.uploadFile(file);
      setForm((current) => ({ ...current, stampImageUrl: response.data.fileUrl }));
      toast.success('อัปโหลดตราประทับเรียบร้อย');
    } catch (error) {
      console.error('Upload organization stamp error:', error);
      toast.error(error.response?.data?.message || 'อัปโหลดตราประทับไม่สำเร็จ');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSignatureUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const response = await adminAPI.uploadSignatureFile(file);
      const signatureUrl = response.data.fileUrl || response.data.fileKey;
      setForm((current) => ({ ...current, signatureImageUrl: signatureUrl }));
      setSignaturePreviewUrl(response.data.signedUrl || '');
      toast.success('อัปโหลดลายเซ็นเรียบร้อย');
    } catch (error) {
      console.error('Upload organization signature error:', error);
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
      const signatureUrl = response.data.fileUrl || response.data.fileKey;
      setForm((current) => ({ ...current, signatureImageUrl: signatureUrl }));
      setSignaturePreviewUrl(response.data.signedUrl || '');
      toast.success('บันทึกลายเซ็นเข้าแบบฟอร์มแล้ว');
    } catch (error) {
      console.error('Upload organization signature error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถบันทึกลายเซ็นได้');
      throw error;
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
          aria-label="ปิดหน้าต่างจัดการหน่วยงาน"
        />

        <div className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-[0_32px_100px_-32px_rgba(15,23,42,0.55)]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-8 py-6">
            <div>
              <h3 className="text-xl font-black text-slate-900">จัดการหน่วยงาน (Organization Presets)</h3>
              <p className="mt-1 text-sm text-slate-500">
                บันทึกตราปั๊มและลายเซ็นกลางของหน่วยงาน เพื่อใช้ในเกียรติบัตร
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
                  placeholder="ค้นหาชื่อหน่วยงาน..."
                />
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                  <div className="py-20 text-center">
                    <Building2 className="mx-auto h-8 w-8 animate-pulse text-slate-200" />
                  </div>
                ) : filteredPresets.length === 0 ? (
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 px-4 py-12 text-center text-sm font-bold text-slate-400">
                    ไม่พบข้อมูลหน่วยงาน
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
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[1.25rem] bg-slate-50 p-2.5 shadow-inner transition-transform group-hover:scale-105">
                            {preset.stampImageUrl ? (
                              <img src={getFullUrl(preset.stampImageUrl)} alt={preset.name} className="h-full w-full object-contain" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-300">
                                <Building2 size={24} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 py-0.5">
                            <p className="truncate font-black text-slate-900">{preset.name}</p>
                            <p className="mt-1 text-xs font-bold text-primary">{preset.signatureTitle || 'ไม่ได้ระบุตำแหน่ง'}</p>
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {preset.signatureImageUrl && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-black uppercase text-emerald-600 border border-emerald-100">
                                  <PenLine size={10} /> Signature
                                </span>
                              )}
                              {preset.stampImageUrl && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[9px] font-black uppercase text-blue-600 border border-blue-100">
                                  <ShieldCheck size={10} /> Stamp
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button 
                            type="button" 
                            onClick={() => handleEdit(preset)} 
                            className={`btn btn-sm px-4 rounded-xl font-bold transition-all ${
                              isEditing ? 'btn-primary' : 'btn-outline border-slate-200'
                            }`}
                          >
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

            {/* Right Side: Editor Form */}
            <div className="flex min-h-0 flex-col bg-white px-8 py-6">
              <form onSubmit={handleSubmit} className="flex h-full flex-col">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                      {editingPreset ? 'Edit Organization' : 'New Organization'}
                    </span>
                    <h4 className="mt-1 text-xl font-black text-slate-900">
                      {editingPreset ? 'ข้อมูลหน่วยงานที่กำลังแก้ไข' : 'เพิ่มข้อมูลหน่วยงานใหม่'}
                    </h4>
                  </div>
                  {editingPreset && (
                    <button type="button" onClick={resetForm} className="btn btn-outline btn-sm rounded-xl">
                      ยกเลิกแก้ไข
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto pr-1 custom-scrollbar">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="ml-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">ชื่อหน่วยงาน</label>
                      <input
                        required
                        type="text"
                        className="form-input w-full rounded-2xl border-slate-200 shadow-sm focus:ring-4 focus:ring-primary/5"
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        placeholder="เช่น ScaleUp Consulting"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="ml-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">ตำแหน่งผู้ลงนาม</label>
                      <input
                        type="text"
                        className="form-input w-full rounded-2xl border-slate-200 shadow-sm focus:ring-4 focus:ring-primary/5"
                        value={form.signatureTitle}
                        onChange={(event) => setForm((current) => ({ ...current, signatureTitle: event.target.value }))}
                        placeholder="เช่น ผู้อำนวยการ"
                      />
                    </div>
                  </div>

                  {/* Assets Grid */}
                  <div className="grid grid-cols-1 gap-6">
                    {/* Signature Module */}
                    <div className="rounded-[2rem] border-2 border-slate-100 bg-slate-50/50 p-6 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-900">ลายเซ็นดิจิทัล (Digital Signature)</p>
                          <p className="text-[10px] font-bold text-slate-400">1000 x 300 px (พื้นหลังโปร่งใส)</p>
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

                      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                        <div className="relative aspect-[10/3] w-full overflow-hidden rounded-2xl border-2 border-white bg-white shadow-inner">
                          {form.signatureImageUrl ? (
                            <SignatureImage src={form.signatureImageUrl} previewSrc={signaturePreviewUrl} alt="Preview" className="h-full w-full object-contain p-2" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-100">
                              <PenLine size={48} />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2">
                           {signatureMode === 'upload' ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => signatureFileInputRef.current?.click()}
                                        className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all rounded-2xl bg-white border border-slate-200 shadow-sm p-1.5"
                                    >
                                        <Upload size={16} />
                                        <span className="text-[9px] font-black uppercase tracking-wider text-center">อัปโหลด</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMediaLibrary({
                                            isOpen: true,
                                            allowedTypes: 'image',
                                            onSelect: (file) => {
                                                setForm(c => ({ ...c, signatureImageUrl: file.fileUrl }));
                                                setSignaturePreviewUrl('');
                                            }
                                        })}
                                        className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all rounded-2xl bg-white border border-slate-200 shadow-sm p-1.5"
                                    >
                                        <PenLine size={16} />
                                        <span className="text-[9px] font-black uppercase tracking-wider text-center">คลังสื่อ</span>
                                    </button>
                                </>
                           ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowSignaturePad(true)}
                                    className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all p-1.5 shadow-sm"
                                >
                                    <PencilLine size={20} />
                                    <span className="text-[9px] font-black uppercase tracking-wider text-center">Redraw<br/>Signature</span>
                                </button>
                           )}
                        </div>
                        <input ref={signatureFileInputRef} type="file" accept="image/png,image/webp" className="hidden" onChange={handleSignatureUpload} />
                      </div>
                      
                      <div className="mt-3">
                        <input
                            type="text"
                            className="form-input w-full rounded-xl bg-white text-[10px] font-medium border-slate-200"
                            value={form.signatureImageUrl}
                            onChange={(e) => setForm(c => ({ ...c, signatureImageUrl: e.target.value }))}
                            placeholder="URL ลายเซ็น..."
                        />
                      </div>
                    </div>

                    {/* Stamp Module */}
                    <div className="rounded-[2rem] border-2 border-slate-100 bg-slate-50/50 p-6 shadow-sm">
                      <div className="mb-4">
                        <p className="text-sm font-black text-slate-900">ตราประทับองค์กร (Official Stamp)</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center sm:text-left">ใช้สำหรับติดบน PDF เกียรติบัตร</p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="flex flex-col items-center gap-2">
                          <div className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-[1.75rem] border-2 border-white bg-white shadow-md transition-transform">
                            {form.stampImageUrl ? (
                              <img src={getFullUrl(form.stampImageUrl)} alt="Stamp Preview" className="h-full w-full object-contain p-2" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-100">
                                <Building2 size={32} />
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1.5">
                              <button
                                  type="button"
                                  onClick={() => stampFileInputRef.current?.click()}
                                  className="btn btn-outline btn-xs px-2 py-1 text-[10px]"
                              >
                                  อัปโหลด
                              </button>
                              <button
                                  type="button"
                                  onClick={() => setMediaLibrary({
                                      isOpen: true,
                                      allowedTypes: 'image',
                                      onSelect: (file) => setForm(c => ({ ...c, stampImageUrl: file.fileUrl }))
                                  })}
                                  className="btn btn-outline btn-xs px-2 py-1 text-[10px]"
                              >
                                  คลังสื่อ
                              </button>
                          </div>
                          <input ref={stampFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleStampUpload} />
                        </div>

                        <div className="flex-1 space-y-3 w-full">
                            <p className="text-[10px] font-bold text-slate-500 leading-relaxed text-center sm:text-left">
                                แนะนำเป็นไฟล์ PNG พื้นหลังโปร่งใส หรือรูปทรงกลม/จตุรัส
                            </p>
                            <input
                                type="text"
                                className="form-input w-full rounded-xl bg-white text-[10px] font-medium border-slate-200"
                                value={form.stampImageUrl}
                                onChange={(e) => setForm(c => ({ ...c, stampImageUrl: e.target.value }))}
                                placeholder="URL ตราประทับ..."
                            />
                        </div>
                      </div>
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
                       <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : editingPreset ? <Save size={20} /> : <Plus size={20} />}
                    {editingPreset ? 'บันทึกข้อมูลหน่วยงาน' : 'สร้างหน่วยงานใหม่'}
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
        title={`เซ็นชื่อสำหรับหน่วยงาน: ${form.name || 'หน่วยงานใหม่'}`}
      />
      <MediaLibraryModal
        isOpen={mediaLibrary.isOpen}
        allowedTypes={mediaLibrary.allowedTypes}
        onClose={() => setMediaLibrary(prev => ({ ...prev, isOpen: false }))}
        onSelect={mediaLibrary.onSelect}
      />
    </ModalPortal>
  );
};

export default OrganizationPresetModal;
