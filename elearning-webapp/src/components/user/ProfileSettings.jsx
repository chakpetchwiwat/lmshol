import React from 'react';
import { Settings, ChevronRight, Bell, Shield, PenLine, Upload } from 'lucide-react';

const ProfileSettings = ({ 
  user,
  notificationsEnabled, 
  onToggleNotifications, 
  onShowPasswordModal, 
  onShowPrivacyModal,
  onSaveSignature,
  onUploadSignature,
  savingSignature,
  uploadingSignature,
}) => {
  const [signatureTitle, setSignatureTitle] = React.useState(user?.signatureTitle || 'Instructor');
  const [signatureImageUrl, setSignatureImageUrl] = React.useState(user?.signatureImageUrl || '');
  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    setSignatureTitle(user?.signatureTitle || 'Instructor');
    setSignatureImageUrl(user?.signatureImageUrl || '');
  }, [user?.signatureImageUrl, user?.signatureTitle]);

  const handleSignatureFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const uploaded = await onUploadSignature(file);
    if (uploaded?.fileUrl) {
      setSignatureImageUrl(uploaded.fileUrl);
    }
    event.target.value = '';
  };

  return (
    <div className="mt-2 flex flex-col gap-1">
      <h4 className="mb-2 pl-2 text-xs font-bold tracking-[0.04em] text-gray-500">
        การตั้งค่า
      </h4>

      <div className="card flex flex-col divide-y divide-gray-100 overflow-hidden border border-gray-100 bg-white shadow-sm">
        <button
          type="button"
          onClick={onShowPasswordModal}
          className="group flex items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-gray-100 p-2.5 text-gray-700 transition-transform group-hover:scale-105">
              <Settings size={20} />
            </div>
            <div>
              <span className="mb-0.5 block text-sm font-bold text-gray-900">
                เปลี่ยนรหัสผ่าน
              </span>
              <span className="block text-xs font-medium text-gray-400">
                อัปเดตรหัสผ่านใหม่เพื่อความปลอดภัย
              </span>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-300 transition-colors group-hover:text-gray-500" />
        </button>

        <div className="p-4">
          <div className="mb-4 flex items-center gap-4">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <PenLine size={20} />
            </div>
            <div>
              <span className="mb-0.5 block text-sm font-bold text-gray-900">Instructor signature</span>
              <span className="block text-xs font-medium text-gray-400">
                Used when this instructor signs course certificates.
              </span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleSignatureFile}
          />

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="text"
              className="form-input w-full"
              value={signatureTitle}
              onChange={(event) => setSignatureTitle(event.target.value)}
              placeholder="Instructor, Course Owner, Trainer"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingSignature}
              className="btn btn-outline btn-sm inline-flex items-center justify-center gap-2"
            >
              <Upload size={14} /> {uploadingSignature ? 'Uploading...' : 'Upload'}
            </button>
          </div>

          {signatureImageUrl && (
            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <img src={signatureImageUrl} alt="Instructor signature" className="h-16 max-w-full object-contain" />
            </div>
          )}

          <button
            type="button"
            onClick={() => onSaveSignature({ signatureTitle, signatureImageUrl })}
            disabled={savingSignature}
            className="btn btn-primary btn-sm mt-3"
          >
            {savingSignature ? 'Saving...' : 'Save signature'}
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleNotifications}
          aria-pressed={notificationsEnabled}
          className="group flex items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 transition-transform group-hover:scale-105">
              <Bell size={20} />
            </div>
            <div>
              <span className="mb-0.5 block text-sm font-bold text-gray-900">การแจ้งเตือน</span>
              <span className="block text-xs font-medium text-gray-400">
                {notificationsEnabled ? 'เปิดการแจ้งเตือนอยู่' : 'ปิดการแจ้งเตือนแล้ว'}
              </span>
            </div>
          </div>
          <div
            className={`flex h-6 w-12 items-center rounded-full p-1 transition-colors ${
              notificationsEnabled ? 'bg-primary' : 'bg-gray-200'
            }`}
          >
            <div
              className={`h-4 w-4 rounded-full bg-white transition-transform ${
                notificationsEnabled ? 'translate-x-6' : ''
              }`}
            />
          </div>
        </button>

        <button
          type="button"
          onClick={onShowPrivacyModal}
          className="group flex items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 transition-transform group-hover:scale-105">
              <Shield size={20} />
            </div>
            <div>
              <span className="mb-0.5 block text-sm font-bold text-gray-900">
                ความเป็นส่วนตัว
              </span>
              <span className="block text-xs font-medium text-gray-400">
                นโยบายและเงื่อนไข
              </span>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-300 transition-colors group-hover:text-gray-500" />
        </button>
      </div>
    </div>
  );
};

export default ProfileSettings;
