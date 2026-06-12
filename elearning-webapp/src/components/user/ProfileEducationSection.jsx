import React from 'react';
import { GraduationCap, Plus, Trash2, Edit2 } from 'lucide-react';
import ProfileEducationModal from './ProfileEducationModal';

const EMPTY_FORM = {
  institution: '',
  degree: '',
  faculty: '',
  major: '',
  graduationYear: '',
};

const ProfileEducationSection = ({ education = [], saving, onSave }) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingEducation, setEditingEducation] = React.useState(null);
  const [form, setForm] = React.useState(EMPTY_FORM);

  const openAddModal = () => {
    setEditingEducation(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingEducation(item);
    setForm({ ...item });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEducation(null);
    setForm(EMPTY_FORM);
  };

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    let newEducation;
    if (editingEducation) {
      newEducation = education.map((item) => 
        item.id === editingEducation.id ? { ...form } : item
      );
    } else {
      newEducation = [
        {
          id: `${Date.now()}`,
          ...form,
        },
        ...education,
      ];
    }

    const success = await onSave(newEducation);
    if (success !== false) {
      closeModal();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('คุณต้องการลบประวัติการศึกษานี้ใช่หรือไม่?')) {
      await onSave(education.filter((item) => item.id !== id));
    }
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-primary">
            <GraduationCap size={22} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Education</p>
            <h3 className="text-xl font-black text-slate-900">ประวัติการศึกษา</h3>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5 active:scale-95"
        >
          <Plus size={18} />
          เพิ่มประวัติการศึกษา
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-100">
        {education.length ? (
          <div className="divide-y divide-slate-100">
            {/* Header row */}
            <div className="hidden lg:grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-3 bg-slate-50/80 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500 border-b border-slate-100">
              <div>สถาบันการศึกษา</div>
              <div>วุฒิการศึกษา</div>
              <div>คณะ</div>
              <div>สาขาวิชา</div>
              <div className="w-[84px] text-center">จัดการ</div>
            </div>
            {education.map((item) => (
              <article 
                key={item.id} 
                className="group relative grid gap-3 bg-white px-4 py-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-center hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-black text-slate-900">{item.institution || '-'}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.graduationYear || '-'}</p>
                </div>
                <p className="text-sm font-bold text-slate-700">{item.degree || '-'}</p>
                <p className="text-sm font-bold text-slate-700">{item.faculty || '-'}</p>
                <p className="text-sm font-bold text-slate-700">{item.major || '-'}</p>
                
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    disabled={saving}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-indigo-50 hover:text-primary disabled:opacity-60"
                    aria-label="แก้ไขประวัติการศึกษา"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={saving}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-60"
                    aria-label="ลบประวัติการศึกษา"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="bg-white px-5 py-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <GraduationCap size={26} />
            </div>
            <p className="text-sm font-black text-slate-800">ยังไม่มีประวัติการศึกษา</p>
            <p className="mx-auto mt-2 max-w-xs text-xs font-medium text-slate-500">
              เพิ่มประวัติการศึกษาของคุณเพื่อช่วยให้ทีมทำความรู้จักคุณได้มากขึ้น
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover active:scale-95"
            >
              <Plus size={16} />
              เพิ่มรายการแรก
            </button>
          </div>
        )}
      </div>

      <ProfileEducationModal
        isOpen={isModalOpen}
        editingEducation={editingEducation}
        form={form}
        saving={saving}
        onClose={closeModal}
        onFormChange={updateForm}
        onSubmit={handleSubmit}
      />
    </section>
  );
};

export default ProfileEducationSection;
