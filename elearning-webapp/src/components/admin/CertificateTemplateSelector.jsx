import React from 'react';
import TemplateCard from './TemplateCard';

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

const CertificateTemplateSelector = ({ selectedId, onSelect }) => {
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
          />
        ))}
      </div>
    </div>
  );
};

export default CertificateTemplateSelector;
