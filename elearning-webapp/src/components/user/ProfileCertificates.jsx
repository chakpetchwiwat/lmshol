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
  lmsCertificates = [],
  saving,
  uploading,
  onCreate,
  onUpdate,
  onDelete,
  onUpload
}) => {
  const [activeTab, setActiveTab] = useState('LMS'); // 'LMS' or 'EXTERNAL'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState(null);
  const [form, setForm] = useState(emptyCertificateForm);

  const sortedExternal = useMemo(
    () => sortCertificatesByIssueDate(certificates),
    [certificates]
  );

  const sortedLms = useMemo(
    () => [...lmsCertificates].sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt)),
    [lmsCertificates]
  );

  const currentList = activeTab === 'LMS' ? sortedLms : sortedExternal;

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
        <h4 className="text-xs font-bold tracking-[0.04em] text-gray-500 uppercase">
          Certification & Training
        </h4>
        {activeTab === 'EXTERNAL' && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <Plus size={15} />
            เพิ่มประวัติการอบรม
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col border-b border-slate-100 bg-gradient-to-r from-amber-50 via-white to-indigo-50">
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
              <Award size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-black text-slate-900">ประวัติการอบรมและหนังสือรับรอง</h3>
              <p className="text-xs font-semibold text-slate-500">เก็บหลักฐานความสำเร็จไว้ในโปรไฟล์เดียว</p>
            </div>
          </div>

          <div className="flex px-4 pb-2 gap-1">
            <button
              onClick={() => setActiveTab('LMS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'LMS' 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              หนังสือรับรองจากระบบ ({sortedLms.length})
            </button>
            <button
              onClick={() => setActiveTab('EXTERNAL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'EXTERNAL' 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              ประวัติการอบรมเพิ่มเติม ({sortedExternal.length})
            </button>
          </div>
        </div>

        {currentList.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <BadgeCheck size={26} />
            </div>
            <p className="text-sm font-black text-slate-800">
              {activeTab === 'LMS' ? 'ยังไม่มีหนังสือรับรองจากระบบ' : 'ยังไม่มีประวัติการอบรมเพิ่มเติม'}
            </p>
            <p className="mx-auto mt-2 max-w-xs text-xs font-medium leading-relaxed text-slate-500">
              {activeTab === 'LMS' 
                ? 'หนังสือรับรองจะปรากฏที่นี่โดยอัตโนมัติเมื่อคุณเรียนจบหลักสูตรที่กำหนด' 
                : 'คุณสามารถเพิ่มใบรับรองจากคอร์สภายนอก หรือประวัติการฝึกอบรมอื่นๆ เพื่อเก็บเป็นพอร์ตโฟลิโอได้'}
            </p>
            {activeTab === 'EXTERNAL' && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover active:scale-95"
              >
                <Plus size={16} />
                เพิ่มรายการแรก
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {currentList.map((cert) => (
              <ProfileCertificateCard
                key={cert.id}
                certificate={cert}
                isLms={activeTab === 'LMS'}
                onEdit={activeTab === 'EXTERNAL' ? openEditModal : undefined}
                onDelete={activeTab === 'EXTERNAL' ? onDelete : undefined}
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
