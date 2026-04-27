import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import ModalPortal from '../../components/common/ModalPortal';
import useAccessibleOverlay from '../../hooks/useAccessibleOverlay';

const PasswordInput = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  inputRef
}) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="mb-4 w-full">
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder={placeholder}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `ซ่อน${label}` : `แสดง${label}`}
          aria-pressed={visible}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
};

const UpdatePasswordModal = ({
  isOpen,
  onClose,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  savingPassword,
  onSave,
  passwordDialogTitleId,
  currentPasswordId,
  newPasswordId,
  confirmNewPasswordId
}) => {
  const editDialogRef = React.useRef(null);
  const editInputRef = React.useRef(null);

  useAccessibleOverlay({
    isOpen,
    onClose,
    containerRef: editDialogRef,
    initialFocusRef: editInputRef,
  });

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
        <button
          type="button"
          className="absolute inset-0 bg-slate-950/65 backdrop-blur-md"
          onClick={onClose}
          aria-label="ปิดหน้าต่างเปลี่ยนรหัสผ่าน"
        />
        <div
          ref={editDialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={passwordDialogTitleId}
          tabIndex={-1}
          className="relative flex w-[calc(100%-2rem)] max-w-xl flex-col items-center rounded-[2.25rem] bg-white/95 p-6 shadow-[0_32px_100px_-32px_rgba(15,23,42,0.55)] animate-fade-in focus:outline-none outline-none md:p-8"
        >
          <h3 id={passwordDialogTitleId} className="mb-6 w-full text-center text-2xl font-black text-slate-800">
            เปลี่ยนรหัสผ่าน
          </h3>

          <PasswordInput
            id={currentPasswordId}
            label="รหัสผ่านปัจจุบัน"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="กรอกรหัสผ่านปัจจุบัน"
            inputRef={editInputRef}
          />

          <PasswordInput
            id={newPasswordId}
            label="รหัสผ่านใหม่"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
          />

          <div className="mb-2 w-full">
            <PasswordInput
              id={confirmNewPasswordId}
              label="ยืนยันรหัสผ่านใหม่"
              value={confirmNewPassword}
              onChange={setConfirmNewPassword}
              placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
            />
          </div>

          <div className="flex w-full gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-200 focus:outline-none"
              disabled={savingPassword}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={savingPassword}
              className="flex flex-1 items-center justify-center rounded-xl bg-primary px-4 py-3 font-bold text-white shadow-md transition-colors hover:bg-primary-hover focus:outline-none"
            >
              {savingPassword ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'เปลี่ยนรหัสผ่าน'
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default UpdatePasswordModal;
