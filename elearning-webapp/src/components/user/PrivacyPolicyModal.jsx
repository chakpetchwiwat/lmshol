import React from 'react';
import { Shield, X } from 'lucide-react';
import ModalPortal from '../../components/common/ModalPortal';
import useAccessibleOverlay from '../../hooks/useAccessibleOverlay';

const PrivacyPolicyModal = ({
  isOpen,
  onClose,
  policyDialogTitleId
}) => {
  const policyDialogRef = React.useRef(null);
  const policyCloseButtonRef = React.useRef(null);

  useAccessibleOverlay({
    isOpen,
    onClose,
    containerRef: policyDialogRef,
    initialFocusRef: policyCloseButtonRef,
  });

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
        <button
          type="button"
          className="absolute inset-0 bg-slate-950/65 backdrop-blur-md"
          onClick={onClose}
          aria-label="ปิดหน้าต่างนโยบายความเป็นส่วนตัว"
        />
        <div
          ref={policyDialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={policyDialogTitleId}
          tabIndex={-1}
          className="relative flex h-[80vh] w-[calc(100%-2rem)] max-w-xl flex-col rounded-[2.25rem] bg-white/95 p-6 shadow-[0_32px_100px_-32px_rgba(15,23,42,0.55)] animate-fade-in focus:outline-none outline-none"
        >
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 id={policyDialogTitleId} className="flex items-center gap-2 text-xl font-black text-slate-800">
              <Shield size={22} className="text-primary" />
              นโยบายความเป็นส่วนตัว
            </h3>
            <button
              ref={policyCloseButtonRef}
              type="button"
              onClick={onClose}
              aria-label="ปิดหน้าต่างนโยบายความเป็นส่วนตัว"
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 focus:outline-none"
            >
              <X size={20} />
            </button>
          </div>

          <div className="custom-scrollbar mb-6 flex-1 space-y-4 overflow-y-auto pr-2 text-sm font-medium leading-relaxed text-slate-600">
            <p>
              ยินดีต้อนรับสู่แพลตฟอร์มการเรียนรู้ของเรา การปกป้องข้อมูลส่วนบุคคลของคุณคือสิ่งสำคัญที่สุด
            </p>
            <h4 className="text-base font-bold text-slate-800">1. การจัดเก็บข้อมูล</h4>
            <p>
              เราจัดเก็บข้อมูลที่จำเป็นต่อการให้บริการ เช่น ชื่อ อีเมล และประวัติการเรียนรู้ของคุณ
              เพื่อมอบประสบการณ์ที่ดีที่สุด
            </p>
            <h4 className="text-base font-bold text-slate-800">2. การใช้ข้อมูล</h4>
            <p>
              ข้อมูลของคุณจะถูกใช้เพื่อการวิเคราะห์และออกใบรับรองการจบหลักสูตร
              ทีมงานไม่มีนโยบายขายข้อมูลส่วนบุคคลของท่านให้กับบุคคลที่สามอย่างเด็ดขาด
            </p>
            <h4 className="text-base font-bold text-slate-800">3. สิทธิของคุณ</h4>
            <p>
              คุณสามารถขอแก้ไขหรือลบข้อมูลบัญชีของตนเองได้ตลอดเวลาตามกฎหมาย PDPA
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-primary py-3.5 font-bold text-white shadow-md transition-all hover:bg-primary-hover hover:shadow-lg focus:outline-none"
          >
            ฉันเข้าใจและยอมรับ
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};

export default PrivacyPolicyModal;
