import React from 'react';
import { Building2, PenLine, Plus, Save, Search, Trash2, X, ShieldCheck } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';
import { adminAPI, getFullUrl } from '../../utils/api';
import { useToast } from '../../context/useToast';

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

  if (!isOpen) {
    return null;
  }

  const resetForm = () => {
    setEditingPreset(null);
    setForm(getDefaultForm());
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

  const handleFileUpload = async (event, field) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const response = await adminAPI.uploadSignatureFile(file);
      setForm((current) => ({ ...current, [field]: response.data.fileUrl }));
      toast.success('อัปโหลดไฟล์เรียบร้อย');
    } catch (error) {
      console.error(`Upload organization ${field} error:`, error);
      toast.error('อัปโหลดไฟล์ไม่สำเร็จ');
    } finally {
      setUploading(false);
      event.target.value = '';
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
          aria-label="ปิดหน้าต่างจัดการพรีเซ็ตหน่วยงาน"
        />

        <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-[0_32px_100px_-32px_rgba(15,23,42,0.55)]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
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

          <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[1.1fr_1fr]">
            <div className="min-h-0 border-r border-slate-100 px-6 py-5">
              <div className="relative mb-5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="form-input w-full pl-10"
                  placeholder="ค้นหาชื่อหน่วยงาน..."
                />
              </div>

              <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-1">
                {loading ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                  </div>
                ) : filteredPresets.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    ยังไม่มีข้อมูลพรีเซ็ตหน่วยงาน
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
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100 p-2">
                            {preset.stampImageUrl ? (
                              <img src={getFullUrl(preset.stampImageUrl)} alt={preset.name} className="h-full w-full object-contain" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <Building2 size={22} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-black text-slate-900">{preset.name}</p>
                            <p className="mt-1 text-sm font-medium text-primary">{preset.signatureTitle || 'ไม่ได้ระบุตำแหน่งผู้ลงนาม'}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {preset.signatureImageUrl && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700">
                                  <PenLine size={10} /> Signature
                                </span>
                              )}
                              {preset.stampImageUrl && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700">
                                  <ShieldCheck size={10} /> Official Stamp
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button type="button" onClick={() => handleEdit(preset)} className="btn btn-outline btn-sm">
                            {isEditing ? 'แก้ไขอยู่' : 'แก้ไข'}
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

            <div className="min-h-0 overflow-y-auto bg-slate-50/60 px-6 py-5">
              <form onSubmit={handleSubmit} className="flex min-h-full flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                      {editingPreset ? 'Edit Preset' : 'New Preset'}
                    </p>
                    <h4 className="mt-1 text-lg font-black text-slate-900">
                      {editingPreset ? 'แก้ไขข้อมูลหน่วยงาน' : 'เพิ่มพรีเซ็ตหน่วยงานใหม่'}
                    </h4>
                  </div>
                  {editingPreset && (
                    <button type="button" onClick={resetForm} className="btn btn-outline btn-sm">
                      ยกเลิกแก้ไข
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">ชื่อหน่วยงาน / องค์กร</label>
                    <input
                      required
                      type="text"
                      className="form-input w-full"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="เช่น ScaleUp Academy"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">ตำแหน่งผู้ลงนามกลาง</label>
                    <input
                      type="text"
                      className="form-input w-full"
                      value={form.signatureTitle}
                      onChange={(event) => setForm((current) => ({ ...current, signatureTitle: event.target.value }))}
                      placeholder="เช่น ผู้อำนวยการสถาบัน"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-4">
                      <p className="text-sm font-black text-slate-900">ไฟล์ลายเซ็น (กลาง)</p>
                      <p className="text-[10px] text-slate-500">PNG พื้นหลังโปร่งใส</p>
                    </div>
                    
                    <input
                      type="file"
                      accept="image/png,image/webp"
                      className="hidden"
                      id="org-signature-upload"
                      onChange={(e) => handleFileUpload(e, 'signatureImageUrl')}
                    />
                    
                    {form.signatureImageUrl ? (
                      <div className="group relative mb-3 aspect-[3/1] overflow-hidden rounded-xl bg-slate-50 border border-slate-100">
                        <img src={getFullUrl(form.signatureImageUrl)} alt="Signature preview" className="h-full w-full object-contain p-2" />
                        <label htmlFor="org-signature-upload" className="absolute inset-0 flex cursor-pointer items-center justify-center bg-slate-900/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <Plus className="text-white" size={24} />
                        </label>
                      </div>
                    ) : (
                      <label htmlFor="org-signature-upload" className="mb-3 flex aspect-[3/1] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-primary/50 hover:bg-primary/5">
                        <Plus className="text-slate-400" size={20} />
                        <span className="mt-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">Upload Signature</span>
                      </label>
                    )}
                    <input
                      type="text"
                      className="form-input text-[10px] w-full"
                      value={form.signatureImageUrl}
                      onChange={(e) => setForm(c => ({ ...c, signatureImageUrl: e.target.value }))}
                      placeholder="หรือใส่ URL ลายเซ็น"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-4">
                      <p className="text-sm font-black text-slate-900">ตราประทับองค์กร</p>
                      <p className="text-[10px] text-slate-500">สำหรับแสดงบนเกียรติบัตร</p>
                    </div>

                    <input
                      type="file"
                      accept="image/png,image/webp,image/jpeg"
                      className="hidden"
                      id="org-stamp-upload"
                      onChange={(e) => handleFileUpload(e, 'stampImageUrl')}
                    />

                    {form.stampImageUrl ? (
                      <div className="group relative mb-3 aspect-square w-24 mx-auto overflow-hidden rounded-xl bg-slate-50 border border-slate-100">
                        <img src={getFullUrl(form.stampImageUrl)} alt="Stamp preview" className="h-full w-full object-contain p-2" />
                        <label htmlFor="org-stamp-upload" className="absolute inset-0 flex cursor-pointer items-center justify-center bg-slate-900/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <Plus className="text-white" size={20} />
                        </label>
                      </div>
                    ) : (
                      <label htmlFor="org-stamp-upload" className="mb-3 aspect-square w-24 mx-auto flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-primary/50 hover:bg-primary/5">
                        <Plus className="text-slate-400" size={20} />
                      </label>
                    )}
                    <input
                      type="text"
                      className="form-input text-[10px] w-full"
                      value={form.stampImageUrl}
                      onChange={(e) => setForm(c => ({ ...c, stampImageUrl: e.target.value }))}
                      placeholder="หรือใส่ URL ตราประทับ"
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 mt-auto flex gap-3 border-t border-slate-200 bg-slate-50/95 pb-1 pt-4 backdrop-blur">
                  <button type="submit" disabled={uploading} className="btn btn-primary flex-1 gap-2">
                    {uploading ? (
                       <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : editingPreset ? <Save size={16} /> : <Plus size={16} />}
                    {editingPreset ? 'บันทึกการแก้ไข' : 'เพิ่มพรีเซ็ตหน่วยงาน'}
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

export default OrganizationPresetModal;
