import React, { useId, useRef } from 'react';
import { Link as LinkIcon, Upload, X } from 'lucide-react';
import ModalPortal from '../../common/ModalPortal';
import useAccessibleOverlay from '../../../hooks/useAccessibleOverlay';

const ProfileCertificateModal = ({
  isOpen,
  editingCertificate,
  form,
  saving,
  uploading,
  onClose,
  onFormChange,
  onFileChange,
  onSubmit
}) => {
  const dialogRef = useRef(null);
  const titleInputRef = useRef(null);
  const titleId = useId();
  const titleInputId = useId();
  const issuerInputId = useId();
  const issueDateId = useId();
  const expirationDateId = useId();
  const noExpirationId = useId();
  const credentialIdInputId = useId();
  const credentialUrlInputId = useId();
  const fileInputId = useId();

  useAccessibleOverlay({
    isOpen,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: titleInputRef,
  });

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4 animate-fade-in">
        <button
          type="button"
          className="absolute inset-0 bg-slate-950/65 backdrop-blur-md"
          onClick={onClose}
          aria-label="ปิดหน้าต่าง certificate"
        />
        <form
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onSubmit={onSubmit}
          className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-[0_32px_100px_-32px_rgba(15,23,42,0.55)] focus:outline-none sm:rounded-[2rem] sm:p-6"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-primary">Certificate</p>
              <h3 id={titleId} className="mt-1 text-xl font-black text-slate-900">
                {editingCertificate ? 'แก้ไข certificate' : 'เพิ่ม certificate'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
              aria-label="ปิด"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor={titleInputId} className="sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">ชื่อ certificate</span>
              <input
                ref={titleInputRef}
                id={titleInputId}
                type="text"
                value={form.title}
                onChange={(event) => onFormChange('title', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 transition-colors focus:border-primary focus:bg-white"
                placeholder="เช่น Advanced Leadership Program"
                required
              />
            </label>

            <label htmlFor={issuerInputId} className="sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">หน่วยงานที่ออก</span>
              <input
                id={issuerInputId}
                type="text"
                value={form.issuer}
                onChange={(event) => onFormChange('issuer', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 transition-colors focus:border-primary focus:bg-white"
                placeholder="เช่น ScaleUp Academy, Coursera, LinkedIn Learning"
                required
              />
            </label>

            <label htmlFor={issueDateId}>
              <span className="mb-2 block text-sm font-bold text-slate-700">วันที่ออก</span>
              <input
                id={issueDateId}
                type="date"
                value={form.issueDate}
                onChange={(event) => onFormChange('issueDate', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 transition-colors focus:border-primary focus:bg-white"
              />
            </label>

            <label htmlFor={expirationDateId} className={form.noExpiration ? 'opacity-50' : ''}>
              <span className="mb-2 block text-sm font-bold text-slate-700">วันหมดอายุ</span>
              <input
                id={expirationDateId}
                type="date"
                value={form.expirationDate}
                onChange={(event) => onFormChange('expirationDate', event.target.value)}
                disabled={form.noExpiration}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 transition-colors focus:border-primary focus:bg-white disabled:cursor-not-allowed"
              />
            </label>

            <label htmlFor={noExpirationId} className="sm:col-span-2 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <input
                id={noExpirationId}
                type="checkbox"
                checked={form.noExpiration}
                onChange={(event) => onFormChange('noExpiration', event.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm font-bold text-slate-700">ไม่มีวันหมดอายุ</span>
            </label>

            <label htmlFor={credentialIdInputId}>
              <span className="mb-2 block text-sm font-bold text-slate-700">Credential ID</span>
              <input
                id={credentialIdInputId}
                type="text"
                value={form.credentialId}
                onChange={(event) => onFormChange('credentialId', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 transition-colors focus:border-primary focus:bg-white"
                placeholder="เช่น ABC-1234"
              />
            </label>

            <label htmlFor={credentialUrlInputId}>
              <span className="mb-2 block text-sm font-bold text-slate-700">Credential URL</span>
              <div className="relative">
                <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id={credentialUrlInputId}
                  type="url"
                  value={form.credentialUrl}
                  onChange={(event) => onFormChange('credentialUrl', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-bold text-slate-900 transition-colors focus:border-primary focus:bg-white"
                  placeholder="https://..."
                />
              </div>
            </label>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-black text-slate-800">
                  <Upload size={17} />
                  ไฟล์เกียรติบัตร
                </p>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                  {form.fileName || 'รองรับ PDF, รูปภาพ และไฟล์เอกสาร'}
                </p>
              </div>
              <label
                htmlFor={fileInputId}
                className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-bold text-primary shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-indigo-50"
              >
                {uploading ? 'กำลังอัปโหลด...' : form.fileName ? 'เปลี่ยนไฟล์' : 'เลือกไฟล์'}
                <input
                  id={fileInputId}
                  type="file"
                  className="sr-only"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                  onChange={onFileChange}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-200"
              disabled={saving || uploading}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex flex-1 items-center justify-center rounded-2xl bg-primary px-4 py-3 font-bold text-white shadow-md transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
              disabled={saving || uploading}
            >
              {saving ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'บันทึก'
              )}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};

export default ProfileCertificateModal;
