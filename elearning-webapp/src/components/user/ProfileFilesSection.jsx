import React from 'react';
import { ExternalLink, FileText, Loader2, Paperclip, Trash2, Upload } from 'lucide-react';

const ProfileFilesSection = ({ files = [], saving, uploading, onUpload, onDelete, onOpen }) => {
  const fileInputRef = React.useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      await onUpload(file);
    }
    event.target.value = '';
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Paperclip size={22} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Other Information</p>
            <h3 className="text-xl font-black text-slate-900">ข้อมูลอื่นๆ</h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || saving}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-60"
        >
          {uploading ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}
          อัปโหลดไฟล์
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
          onChange={handleFileChange}
        />
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-100">
        {files.length ? (
          <div className="divide-y divide-slate-100">
            {files.map((file) => (
              <article key={file.id} className="flex flex-col gap-4 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
                    <FileText size={21} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{file.title || file.fileName || 'ไฟล์แนบ'}</p>
                    <p className="mt-1 truncate text-xs font-bold text-slate-400">
                      {file.fileName || '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(file)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    เปิดไฟล์
                    <ExternalLink size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(file.id)}
                    disabled={saving}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-60"
                    aria-label="ลบไฟล์"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center bg-slate-50/70 px-5 py-10 text-center transition-colors hover:bg-emerald-50/50"
          >
            <Upload size={28} className="text-slate-300" />
            <p className="mt-3 text-sm font-black text-slate-700">อัปโหลดไฟล์ข้อมูลอื่นๆ</p>
            <p className="mt-1 text-xs font-bold text-slate-400">รองรับ PDF, รูปภาพ และไฟล์เอกสาร</p>
          </button>
        )}
      </div>
    </section>
  );
};

export default ProfileFilesSection;
