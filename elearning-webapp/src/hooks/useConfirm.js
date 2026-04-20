import { useCallback, useRef, useState } from 'react';

/**
 * useConfirm — Hook to replace window.confirm() with a premium dialog.
 *
 * Usage:
 *   const { confirm, ConfirmDialogProps } = useConfirm();
 *
 *   const handleDelete = async () => {
 *     const ok = await confirm({
 *       title: 'ยืนยันการลบ',
 *       message: 'คุณแน่ใจหรือไม่?',
 *       confirmLabel: 'ลบ',
 *       variant: 'danger',
 *     });
 *     if (!ok) return;
 *   };
 */
const useConfirm = () => {
  const resolveRef = useRef(null);
  const [state, setState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'ยืนยัน',
    cancelLabel: 'ยกเลิก',
    variant: 'danger',
  });

  const confirm = useCallback(({ title, message, confirmLabel, cancelLabel, variant } = {}) => (
    new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        isOpen: true,
        title: title || 'ยืนยันการดำเนินการ',
        message: message || '',
        confirmLabel: confirmLabel || 'ยืนยัน',
        cancelLabel: cancelLabel || 'ยกเลิก',
        variant: variant || 'danger',
      });
    })
  ), []);

  const closeDialog = useCallback((confirmed) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const ConfirmDialogProps = {
    isOpen: state.isOpen,
    title: state.title,
    message: state.message,
    confirmLabel: state.confirmLabel,
    cancelLabel: state.cancelLabel,
    variant: state.variant,
    onConfirm: () => closeDialog(true),
    onCancel: () => closeDialog(false),
  };

  return { confirm, ConfirmDialogProps };
};

export default useConfirm;
