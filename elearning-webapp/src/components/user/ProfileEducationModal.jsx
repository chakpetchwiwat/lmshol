import React from 'react';
import { GraduationCap, X } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';
import useAccessibleOverlay from '../../hooks/useAccessibleOverlay';
import CustomSelect from '../common/CustomSelect';

const DEGREE_OPTIONS = [
  { value: 'มัธยมศึกษาตอนต้น', label: 'มัธยมศึกษาตอนต้น' },
  { value: 'มัธยมศึกษาตอนปลาย', label: 'มัธยมศึกษาตอนปลาย' },
  { value: 'ประกาศนียบัตรวิชาชีพ (ปวช.)', label: 'ประกาศนียบัตรวิชาชีพ (ปวช.)' },
  { value: 'ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)', label: 'ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)' },
  { value: 'ปริญญาตรี', label: 'ปริญญาตรี' },
  { value: 'ปริญญาโท', label: 'ปริญญาโท' },
  { value: 'ปริญญาเอก', label: 'ปริญญาเอก' },
  { value: 'อื่นๆ', label: 'อื่นๆ' },
];

const ProfileEducationModal = ({
  isOpen,
  editingEducation,
  form,
  saving,
  onClose,
  onFormChange,
  onSubmit
}) => {
  const dialogRef = React.useRef(null);
  const institutionInputRef = React.useRef(null);
  const titleId = React.useId();
  const institutionId = React.useId();
  const facultyId = React.useId();
  const majorId = React.useId();
  const yearId = React.useId();

  useAccessibleOverlay({
    isOpen,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: institutionInputRef,
  });

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4 animate-fade-in">
        <button
          type="button"
          className="absolute inset-0 bg-slate-950/65 backdrop-blur-md"
          onClick={onClose}
          aria-label="ปิดหน้าต่างประวัติการศึกษา"
        />
        <form
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onSubmit={onSubmit}
          className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-[0_32px_100px_-32px_rgba(15,23,42,0.55)] focus:outline-none sm:rounded-[2rem] sm:p-6"
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-primary shadow-sm">
                <GraduationCap size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-primary">Education History</p>
                <h3 id={titleId} className="text-xl font-black text-slate-900">
                  {editingEducation ? 'แก้ไขประวัติการศึกษา' : 'เพิ่มประวัติการศึกษา'}
                </h3>
              </div>
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

          <div className="grid gap-4">
            <label htmlFor={institutionId}>
              <span className="mb-2 block text-sm font-bold text-slate-700">สถาบันการศึกษา</span>
              <input
                ref={institutionInputRef}
                id={institutionId}
                type="text"
                value={form.institution}
                onChange={(event) => onFormChange('institution', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 transition-colors focus:border-primary focus:bg-white"
                placeholder="ระบุชื่อสถาบัน"
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <span className="mb-2 block text-sm font-bold text-slate-700">ระดับการศึกษา</span>
                <CustomSelect
                  options={DEGREE_OPTIONS}
                  value={form.degree}
                  onChange={(event) => onFormChange('degree', event.target.value)}
                  placeholder="เลือกระดับการศึกษา"
                />
              </div>

              <label htmlFor={yearId}>
                <span className="mb-2 block text-sm font-bold text-slate-700">ปีที่สำเร็จการศึกษา</span>
                <input
                  id={yearId}
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 543 + 10}
                  value={form.graduationYear}
                  onChange={(event) => onFormChange('graduationYear', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 transition-colors focus:border-primary focus:bg-white"
                  placeholder="พ.ศ. หรือ ค.ศ."
                  required
                />
              </label>
            </div>

            <label htmlFor={facultyId}>
              <span className="mb-2 block text-sm font-bold text-slate-700">คณะ</span>
              <input
                id={facultyId}
                type="text"
                value={form.faculty}
                onChange={(event) => onFormChange('faculty', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 transition-colors focus:border-primary focus:bg-white"
                placeholder="ระบุคณะ"
              />
            </label>

            <label htmlFor={majorId}>
              <span className="mb-2 block text-sm font-bold text-slate-700">สาขาวิชา</span>
              <input
                id={majorId}
                type="text"
                value={form.major}
                onChange={(event) => onFormChange('major', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 transition-colors focus:border-primary focus:bg-white"
                placeholder="ระบุสาขาวิชา"
              />
            </label>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-200"
              disabled={saving}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex flex-1 items-center justify-center rounded-2xl bg-primary px-4 py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={saving}
            >
              {saving ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'บันทึกข้อมูล'
              )}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};

export default ProfileEducationModal;
