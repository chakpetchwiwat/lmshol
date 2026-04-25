import React, { useMemo, useState } from 'react';
import { Award, BadgeCheck, Plus } from 'lucide-react';
import ProfileCertificateCard from './certificates/ProfileCertificateCard';
import ProfileCertificateModal from './certificates/ProfileCertificateModal';
import {
  buildFormFromCertificate,
  emptyCertificateForm,
  sortCertificatesByIssueDate
} from './certificates/certificateForm.utils';

const ProfileCertificates = ({
  certificates,
  saving,
  uploading,
  onCreate,
  onUpdate,
  onDelete,
  onUpload
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState(null);
  const [form, setForm] = useState(emptyCertificateForm);

  const sortedCertificates = useMemo(
    () => sortCertificatesByIssueDate(certificates),
    [certificates]
  );

  const openCreateModal = () => {
    setEditingCertificate(null);
    setForm(emptyCertificateForm);
    setIsModalOpen(true);
  };

  const openEditModal = (certificate) => {
    setEditingCertificate(certificate);
    setForm(buildFormFromCertificate(certificate));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCertificate(null);
    setForm(emptyCertificateForm);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'noExpiration' && value ? { expirationDate: '' } : {})
    }));
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadedFile = await onUpload(file);
    if (uploadedFile) {
      setForm((current) => ({
        ...current,
        fileUrl: uploadedFile.fileUrl || '',
        fileKey: uploadedFile.fileKey || '',
        fileName: uploadedFile.fileName || file.name,
        fileMimeType: uploadedFile.fileMimeType || file.type
      }));
    }

    event.target.value = '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const savedCertificate = editingCertificate
      ? await onUpdate(editingCertificate.id, form)
      : await onCreate(form);

    if (savedCertificate) {
      closeModal();
    }
  };

  return (
    <section className="mt-2 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 pl-2">
        <h4 className="text-xs font-bold tracking-[0.04em] text-gray-500">
          CERTIFICATES
        </h4>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5"
        >
          <Plus size={15} />
          เพิ่ม
        </button>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center gap-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 via-white to-indigo-50 px-5 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Award size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-black text-slate-900">ใบรับรองและผลงาน</h3>
            <p className="text-xs font-semibold text-slate-500">เก็บหลักฐานความสำเร็จไว้ในโปรไฟล์เดียว</p>
          </div>
        </div>

        {sortedCertificates.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <BadgeCheck size={26} />
            </div>
            <p className="text-sm font-black text-slate-800">ยังไม่มี certificate</p>
            <p className="mx-auto mt-1 max-w-xs text-xs font-medium leading-6 text-slate-500">
              เพิ่มใบรับรองจากคอร์ส องค์กร หรือแพลตฟอร์มภายนอก พร้อมแนบไฟล์หรือ Credential URL ได้
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-primary-hover"
            >
              <Plus size={16} />
              เพิ่ม certificate แรก
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedCertificates.map((certificate) => (
              <ProfileCertificateCard
                key={certificate.id}
                certificate={certificate}
                onEdit={openEditModal}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>

      <ProfileCertificateModal
        isOpen={isModalOpen}
        editingCertificate={editingCertificate}
        form={form}
        saving={saving}
        uploading={uploading}
        onClose={closeModal}
        onFormChange={updateForm}
        onFileChange={handleFileChange}
        onSubmit={handleSubmit}
      />
    </section>
  );
};

export default ProfileCertificates;
