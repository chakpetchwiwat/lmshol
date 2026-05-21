import React from 'react';
import { X } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';
import TemplateCard, { CertificateArtwork } from './TemplateCard';

const TEMPLATES = [
  {
    id: 'CLASSIC_001',
    name: 'Classic Elegance',
    description: 'เน้นความหรูหรา ทางการ มีเส้นขอบแบบดั้งเดิมและสีทอง ดูเป็นพิธีการ'
  },
  {
    id: 'MODERN_001',
    name: 'Modern Professional',
    description: 'ดีไซน์สะอาดตา มีแถบสีด้านข้างและตัวหนา ดูร่วมสมัยและเป็นมืออาชีพ'
  },
  {
    id: 'MINIMAL_001',
    name: 'Minimalist Premium',
    description: 'เรียบหรูด้วยพื้นที่ว่างและการจัดวางตัวอักษรที่ประณีต ดูแพงและทันสมัย'
  }
];

const CertificateTemplateSelector = ({ selectedId, onSelect, signatureSlots = [] }) => {
  const [previewTemplate, setPreviewTemplate] = React.useState(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-black text-indigo-900">รูปแบบเกียรติบัตร (Template Style)</label>
        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-indigo-600">
          Required
        </span>
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TEMPLATES.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedId === template.id}
            onSelect={onSelect}
            onPreview={setPreviewTemplate}
            signatureSlots={signatureSlots}
          />
        ))}
      </div>

      <ModalPortal isOpen={Boolean(previewTemplate)}>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-md">
          <div className="w-full max-w-5xl overflow-hidden rounded-[1.5rem] bg-white shadow-2xl shadow-slate-950/30">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-indigo-500">Certificate preview</p>
                <h3 className="truncate text-lg font-black text-slate-900">{previewTemplate?.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close certificate preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="bg-slate-100 p-4 sm:p-6">
              <div className="mx-auto max-w-4xl overflow-hidden rounded-xl ring-1 ring-slate-200">
                {previewTemplate && <CertificateArtwork template={previewTemplate} size="full" signatureSlots={signatureSlots} />}
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-bold leading-relaxed text-slate-500">{previewTemplate?.description}</p>
              <button
                type="button"
                onClick={() => {
                  if (previewTemplate) {
                    onSelect(previewTemplate.id);
                  }
                  setPreviewTemplate(null);
                }}
                className="btn btn-primary shrink-0"
              >
                Select template
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};

export default CertificateTemplateSelector;
