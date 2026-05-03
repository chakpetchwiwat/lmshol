import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import ModalPortal from './ModalPortal';

/**
 * ConfirmDialog — Premium confirmation modal replacing window.confirm().
 *
 * Usage:
 *   <ConfirmDialog
 *     isOpen={showDialog}
 *     title="ยืนยันการลบ"
 *     message="คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?"
 *     confirmLabel="ลบ"
 *     cancelLabel="ยกเลิก"
 *     variant="danger"          // "danger" | "warning" | "primary"
 *     onConfirm={() => { ... }}
 *     onCancel={() => setShowDialog(false)}
 *   />
 */
const ConfirmDialog = ({
  isOpen,
  title = 'ยืนยันการดำเนินการ',
  message,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  const cancelRef = React.useRef(null);
  const overlayRef = React.useRef(null);

  // Focus the cancel button when opening (safe default)
  React.useEffect(() => {
    if (isOpen && cancelRef.current) {
      cancelRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'text-danger',
      iconBg: 'bg-red-50',
      btn: 'bg-danger text-white hover:bg-red-700',
    },
    warning: {
      icon: 'text-warning',
      iconBg: 'bg-amber-50',
      btn: 'bg-warning text-white hover:bg-amber-600',
    },
    primary: {
      icon: 'text-primary',
      iconBg: 'bg-primary/10',
      btn: 'bg-primary text-white hover:bg-primary/90',
    },
  }[variant] || variantStyles.danger;

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onCancel?.();
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-start gap-4 p-6 pb-2">
            <div className={`shrink-0 p-2.5 rounded-xl ${variantStyles[variant]?.iconBg || 'bg-red-50'}`}>
              <AlertTriangle size={22} className={variantStyles[variant]?.icon || 'text-danger'} />
            </div>
            <div className="flex-1 min-w-0">
              <h3
                id="confirm-dialog-title"
                className="text-base font-bold text-slate-900"
              >
                {title}
              </h3>
              <p
                id="confirm-dialog-message"
                className="mt-1 text-sm text-slate-500 leading-relaxed"
              >
                {message}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="shrink-0 p-1.5 -mt-1 -mr-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="ปิด"
            >
              <X size={16} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 pt-4">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 text-sm font-bold rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm?.();
                onCancel?.();
              }}
              className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors ${variantStyles[variant]?.btn || 'bg-danger text-white hover:bg-red-700'}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ConfirmDialog;
