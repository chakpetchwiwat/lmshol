import React from 'react';
import { Settings, ChevronRight, Bell, Shield, PenLine, Upload, PencilLine } from 'lucide-react';
import SignaturePadModal from '../common/SignaturePadModal';

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
  const [signatureMode, setSignatureMode] = React.useState('upload');
  const [setupOpen, setSetupOpen] = React.useState(false);
  const [showSignaturePad, setShowSignaturePad] = React.useState(false);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    setSignatureTitle(user?.signatureTitle || 'Instructor');
    setSignatureImageUrl(user?.signatureImageUrl || '');
    setSetupOpen(false);
  }, [user?.signatureImageUrl, user?.signatureTitle]);

  const validateSignatureFile = (file) => {
    if (!['image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Signature must be PNG or WebP.');
    }
  };

  const handleSignatureFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      validateSignatureFile(file);
      // We still need a quick way to check if it's 1000x300 and transparent, 
      // but for simplicity on user side, we'll trust the upload or let the backend handle it.
      // Actually, it's better to keep the same validation if possible.
      const uploaded = await onUploadSignature(file);
      if (uploaded?.fileUrl) {
        setSignatureImageUrl(uploaded.fileUrl);
      }
    } catch (error) {
      window.alert(error.message || 'Invalid signature image.');
    } finally {
      event.target.value = '';
    }
  };

  const handleDrawnSignature = async (file) => {
    const uploaded = await onUploadSignature(file);
    if (uploaded?.fileUrl) {
      setSignatureImageUrl(uploaded.fileUrl);
    }
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

        {(user?.role === 'admin' || user?.isCourseStaff) && (
          <div className="p-4">
            <div className="mb-4 flex items-center gap-4">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                <PenLine size={20} />
              </div>
              <div>
                <span className="mb-0.5 block text-sm font-bold text-gray-900">Instructor signature</span>
                <span className="block text-xs font-medium text-gray-400">
                  ใช้สำหรับเซ็นชื่อในเกียรติบัตรเมื่อท่านเป็นผู้สอน
                </span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/png,image/webp"
              onChange={handleSignatureFile}
            />

            {!setupOpen && signatureImageUrl ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">Current signature</p>
                    <img src={signatureImageUrl} alt="Instructor signature" className="h-16 max-w-full object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSetupOpen(true)}
                    className="btn btn-outline btn-sm inline-flex items-center justify-center gap-2"
                  >
                    <PenLine size={14} /> Change signature
                  </button>
                </div>
              </div>
            ) : (
              <>
                {!signatureImageUrl && !setupOpen ? (
                  <button
                    type="button"
                    onClick={() => setSetupOpen(true)}
                    className="btn btn-primary btn-sm gap-2"
                  >
                    <PenLine size={14} /> Add signature
                  </button>
                ) : (
                  <>
                    <label className="mb-1.5 ml-1 block text-xs font-black text-slate-500">Signature title (ตำแหน่งใต้ลายเซ็น)</label>
                    <input
                      type="text"
                      className="form-input w-full"
                      value={signatureTitle}
                      onChange={(event) => setSignatureTitle(event.target.value)}
                      placeholder="เช่น Instructor, Course Owner, Trainer"
                    />

                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => setSignatureMode('upload')}
                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition-colors ${
                          signatureMode === 'upload' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <Upload size={15} />
                        Upload image
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignatureMode('draw')}
                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition-colors ${
                          signatureMode === 'draw' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <PencilLine size={15} />
                        Sign on web
                      </button>
                    </div>

                    {signatureMode === 'upload' ? (
                      <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-black text-slate-900">Upload transparent signature</p>
                            <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500">
                              PNG หรือ WebP เท่านั้น พื้นหลังโปร่งใส แนะนำขนาด 1000 x 300 px
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingSignature}
                            className="btn btn-outline btn-sm inline-flex items-center justify-center gap-2"
                          >
                            <Upload size={14} /> {uploadingSignature ? 'Uploading...' : 'Choose file'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                        <button
                          type="button"
                          onClick={() => setShowSignaturePad(true)}
                          className="btn btn-primary btn-sm mx-auto flex gap-2"
                        >
                          <PenLine size={14} /> เซ็นชื่อบนเว็บ
                        </button>
                        <p className="mt-3 text-[10px] font-medium text-slate-400">
                          เซ็นผ่านหน้าจอขนาดใหญ่เพื่อความสะดวกและชัดเจน
                        </p>
                      </div>
                    )}

                    {signatureImageUrl && (
                      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">Current signature</p>
                        <img src={signatureImageUrl} alt="Instructor signature" className="h-16 max-w-full object-contain" />
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                       <button
                        type="button"
                        onClick={() => onSaveSignature({ signatureTitle, signatureImageUrl })}
                        disabled={savingSignature || uploadingSignature}
                        className="btn btn-primary btn-sm flex-1"
                      >
                        {savingSignature ? 'Saving...' : 'บันทึกลายเซ็น'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSetupOpen(false)}
                        className="btn btn-outline btn-sm"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

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

      <SignaturePadModal
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={handleDrawnSignature}
        title={`เซ็นชื่อวิทยากร: ${user?.name}`}
      />
    </div>
  );
};

export default ProfileSettings;
