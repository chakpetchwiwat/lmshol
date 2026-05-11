import React from 'react';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';

const EMPTY_FORM = {
  institution: '',
  degree: '',
  faculty: '',
  major: '',
  graduationYear: '',
};

const ProfileEducationSection = ({ education = [], saving, onSave }) => {
  const [form, setForm] = React.useState(EMPTY_FORM);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleAdd = async () => {
    const hasValue = Object.values(form).some((value) => String(value || '').trim());
    if (!hasValue) return;

    await onSave([
      {
        id: `${Date.now()}`,
        ...form,
      },
      ...education,
    ]);
    setForm(EMPTY_FORM);
  };

  const handleDelete = async (id) => {
    await onSave(education.filter((item) => item.id !== id));
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
      </div>

      <div className="grid gap-3 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 lg:grid-cols-5">
        {[
          ['institution', 'สถาบัน'],
          ['degree', 'ระดับการศึกษา'],
          ['faculty', 'คณะ'],
          ['major', 'สาขา'],
          ['graduationYear', 'ปีที่จบ'],
        ].map(([key, label]) => (
          <label key={key} className="block">
            <span className="mb-1.5 block text-[11px] font-black text-slate-500">{label}</span>
            <input
              type={key === 'graduationYear' ? 'number' : 'text'}
              value={form[key]}
              onChange={(event) => updateField(key, event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-primary"
            />
          </label>
        ))}
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-60 lg:col-span-5"
        >
          <Plus size={17} />
          เพิ่มประวัติการศึกษา
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-100">
        {education.length ? (
          <div className="divide-y divide-slate-100">
            {education.map((item) => (
              <article key={item.id} className="grid gap-3 bg-white px-4 py-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-center">
                <div>
                  <p className="text-sm font-black text-slate-900">{item.institution || '-'}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.graduationYear || '-'}</p>
                </div>
                <p className="text-sm font-bold text-slate-700">{item.degree || '-'}</p>
                <p className="text-sm font-bold text-slate-700">{item.faculty || '-'}</p>
                <p className="text-sm font-bold text-slate-700">{item.major || '-'}</p>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={saving}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-60"
                  aria-label="ลบประวัติการศึกษา"
                >
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="bg-white px-5 py-10 text-center">
            <p className="text-sm font-bold text-slate-500">ยังไม่มีประวัติการศึกษา</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProfileEducationSection;
