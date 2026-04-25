import React from 'react';
import { X, Upload, CheckCircle2, Globe, Users } from 'lucide-react';

import ModalPortal from '../common/ModalPortal';
import RichTextEditor from '../common/RichTextEditor';
import QuizBuilder from '../admin/QuizBuilder';
import CustomDateTimePicker from '../common/CustomDateTimePicker';
import CustomSelect from '../common/CustomSelect';

const AnnouncementModal = ({
  isOpen,
  onClose,
  isEditing,
  form,
  setForm,
  onSave,
  onImageUpload,
  onDocUpload,
  onEditorImageUpload,
  isFullAdmin,
  user,
  departments,
  uploading,
  editorImageUploading = false,
}) => {
  // Render specific attachment/content forms based on type
  const renderSourceField = () => {
    switch (form.type) {
      case 'video':
        return (
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">วิดีโอ URL (YouTube/Vimeo/Internal)</label>
            <input
              type="text"
              className="form-input w-full"
              value={form.contentUrl || ''}
              onChange={(event) => setForm((current) => ({ ...current, contentUrl: event.target.value }))}
              placeholder="https://..."
            />
          </div>
        );
      case 'pdf':
      case 'document':
        return (
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">ไฟล์เอกสาร (PDF)</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="form-input flex-1"
                value={form.contentUrl || ''}
                onChange={(event) => setForm((current) => ({ ...current, contentUrl: event.target.value }))}
                placeholder="URL ของไฟล์ หรือคลิกอัปโหลด"
              />
              <label className="btn btn-outline btn-sm gap-1 cursor-pointer">
                <Upload size={14} />
                อัปโหลดเอกสาร
                <input type="file" accept=".pdf" className="hidden" onChange={onDocUpload} />
              </label>
            </div>
          </div>
        );
      case 'quiz':
        return (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <h5 className="mb-4 text-base font-bold text-slate-800">จัดการแบบทดสอบ</h5>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">เปอร์เซ็นต์ที่สอบผ่าน (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-input w-full"
                  value={form.passScore || 60}
                  onChange={(event) => setForm((current) => ({ ...current, passScore: Number(event.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">ระยะเวลาทำแบบทดสอบ (นาที)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input w-full"
                  value={form.duration || 0}
                  onChange={(event) => setForm((current) => ({ ...current, duration: Number(event.target.value) || 0 }))}
                  placeholder="ปล่อยว่าง หรือ 0 หากไม่จำกัดเวลา"
                />
              </div>
            </div>
            
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <QuizBuilder 
                questions={form.questions || []} 
                onChange={(questions) => setForm((current) => ({ ...current, questions }))} 
              />
            </div>
          </div>
        );
      case 'article':
      default:
        return null;
    }
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
        <div className="card flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden border border-gray-100 bg-white p-0 shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
            <h4 className="text-lg font-bold">{isEditing ? 'แก้ไขประกาศ' : 'สร้างประกาศใหม่'}</h4>
            <button type="button" onClick={onClose} className="text-muted hover:text-gray-900">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={onSave} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-bold text-gray-700">ชื่อประกาศ</label>
                  <input
                    required
                    type="text"
                    className="form-input w-full"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="เช่น แจ้งปิดระบบชั่วคราวสำหรับแผนกขาย"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-bold text-gray-700">คำอธิบายสั้น</label>
                  <textarea
                    rows={3}
                    className="form-input w-full"
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="สรุปสั้น ๆ เพื่อแสดงบนการ์ดประกาศ"
                  />
                </div>


                {isFullAdmin && (
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-bold text-gray-700">กลุ่มเป้าหมาย (Scope)</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setForm(current => ({ ...current, scope: 'GLOBAL', departmentId: null }))}
                        className={`flex items-center justify-center gap-3 rounded-xl border-2 p-4 transition-all ${
                          form.scope === 'GLOBAL'
                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                            : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        <Globe size={20} className={form.scope === 'GLOBAL' ? 'text-primary' : 'text-slate-400'} />
                        <div className="text-left">
                          <p className="text-sm font-bold">ทั้งองค์กร (Global)</p>
                          <p className="text-xs opacity-80">แสดงให้พนักงานทุกคนเห็น</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(current => ({ ...current, scope: 'DEPARTMENT', departmentId: departments[0]?.id || '' }))}
                        className={`flex items-center justify-center gap-3 rounded-xl border-2 p-4 transition-all ${
                          form.scope === 'DEPARTMENT'
                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                            : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        <Users size={20} className={form.scope === 'DEPARTMENT' ? 'text-primary' : 'text-slate-400'} />
                        <div className="text-left">
                          <p className="text-sm font-bold">เฉพาะแผนก (Department)</p>
                          <p className="text-xs opacity-80">แสดงเฉพาะแผนกที่เลือก</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                <div className={isFullAdmin && form.scope === 'GLOBAL' ? 'hidden' : ''}>
                  {isFullAdmin ? (
                    <CustomSelect
                      label="แผนก"
                      placeholder="เลือกแผนก..."
                      value={form.departmentId}
                      onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value }))}
                      options={[
                        { value: '', label: 'เลือกแผนก' },
                        ...departments.map((department) => ({ value: department.id, label: department.name }))
                      ]}
                    />
                  ) : (

                    <div className="flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 ">
                      <CheckCircle2 size={16} className="text-primary" />
                      <span className="text-sm font-bold text-primary">
                        แผนกของคุณ: {user?.department || 'กำลังโหลด...'}
                      </span>
                    </div>
                  )}
                </div>

                  <CustomSelect
                    label="ชนิดหน้า"
                    value={form.type}
                    onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                    options={[
                      { value: 'video', label: 'วิดีโอ' },
                      { value: 'pdf', label: 'เอกสาร' },
                      { value: 'article', label: 'บทความ' },
                      { value: 'quiz', label: 'แบบทดสอบ' }
                    ]}
                  />

                <div className="md:col-span-2">
                  <CustomDateTimePicker
                    value={form.expiredAt}
                    onChange={(event) => setForm((current) => ({ ...current, expiredAt: event.target.value }))}
                    label="วันหมดอายุของประกาศ"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-bold text-gray-700">ภาพหน้าปก</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="form-input flex-1"
                      value={form.image}
                      onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))}
                      placeholder="URL ของภาพหน้าปก"
                    />
                    <label className="btn btn-outline btn-sm gap-1 cursor-pointer">
                      <Upload size={14} />
                      อัปโหลด
                      <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
                    </label>
                  </div>
                </div>

                {form.type !== 'quiz' && (
                  <div>
                    <label className="mb-1 block text-sm font-bold text-gray-700">ระยะเวลาโดยประมาณ (นาที)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input w-full"
                      value={form.duration || 0}
                      onChange={(event) => setForm((current) => ({ ...current, duration: Number(event.target.value) || 0 }))}
                    />
                  </div>
                )}

                <div className={form.type === 'quiz' ? 'md:col-span-2' : ''}>
                  {renderSourceField()}
                </div>

                {form.type !== 'quiz' ? (
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-bold text-gray-700">เนื้อหาประกาศ</label>
                    <RichTextEditor
                      label="Announcement content editor"
                      value={form.content || ''}
                      onChange={(content) => setForm((current) => ({ ...current, content }))}
                      onImageUpload={onEditorImageUpload}
                      imageUploading={editorImageUploading}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 p-4">
              <button type="button" onClick={onClose} className="btn btn-outline px-6">
                ยกเลิก
              </button>
              <button type="submit" disabled={uploading} className="btn btn-primary px-8">
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    กำลังบันทึก...
                  </div>
                ) : (
                  'บันทึกประกาศ'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default AnnouncementModal;
