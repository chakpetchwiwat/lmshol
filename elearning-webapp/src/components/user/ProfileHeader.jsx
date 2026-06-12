import React from 'react';
import { Camera, Loader2, User as UserIcon } from 'lucide-react';
import { getRoleLabel } from '../../utils/roles';
import { getFullUrl } from '../../utils/api';
import { formatThaiDateTime } from '../../utils/dateUtils';

const ProfileHeader = ({ user, onUploadProfileImage, uploadingImage }) => {
  const fileInputRef = React.useRef(null);
  const imageUrl = user?.profileImageUrl ? getFullUrl(user.profileImageUrl) : '';
  const infoRows = [
    { label: 'ชื่อ-นามสกุล', value: user?.name || '-' },
    { label: 'ชื่อเล่น', value: user?.nickname || '-' },
    { label: 'วันเกิด', value: user?.birthday ? formatThaiDateTime(user.birthday, false) : '-' },
    { label: 'วันบัพติศมาในน้ำ', value: user?.waterBaptismDate ? formatThaiDateTime(user.waterBaptismDate, false) : '-' },
    { label: 'วันบัพติศมาในพระวิญญาณ', value: user?.spiritBaptismDate ? formatThaiDateTime(user.spiritBaptismDate, false) : '-' },
    { label: 'สังกัด', value: user?.department || '-' },
    { label: 'ตำแหน่งคริสตจักร', value: user?.tier?.name || user?.position || '-' },
    { label: 'บทบาทบน Platform', value: getRoleLabel(user) || '-' },
  ];

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      await onUploadProfileImage?.(file);
    }
    event.target.value = '';
  };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[19rem_1fr]">
        <div className="flex flex-col items-center justify-center bg-slate-50 px-6 py-8">
          <div className="relative h-40 w-40 overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.75)]">
            {imageUrl ? (
              <img src={imageUrl} alt={user?.name || 'Profile'} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-50 text-slate-400">
                <UserIcon size={58} strokeWidth={1.6} />
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-70"
              aria-label="เปลี่ยนรูปโปรไฟล์"
            >
              {uploadingImage ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="mt-4 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-60"
          >
            {uploadingImage ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูปโปรไฟล์'}
          </button>
        </div>

        <div className="px-6 py-7 sm:px-8">
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Profile Information</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">ข้อมูลผู้ใช้งาน</h2>
          </div>

          <div className="grid gap-3">
            {infoRows.map((row, index) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 sm:grid-cols-[11rem_1fr] sm:items-center"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-black text-primary shadow-sm">
                    {index + 1}
                  </span>
                  <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">{row.label}</span>
                </div>
                <p className="min-w-0 break-words text-sm font-black text-slate-900 sm:text-base">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfileHeader;
