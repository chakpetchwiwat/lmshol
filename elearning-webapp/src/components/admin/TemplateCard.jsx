import React from 'react';
import { Check, Eye } from 'lucide-react';

const CertificateArtwork = ({ template, size = 'card' }) => {
  const isFull = size === 'full';
  const demo = {
    learnerName: 'Alex Morgan',
    courseTitle: 'Advanced Workplace Learning',
    certificateNo: 'CERT-2026-0427',
    issuedAt: '03 May 2026'
  };

  const scaleClass = isFull
    ? 'aspect-[1.414/1] text-[clamp(8px,1.1vw,15px)]'
    : 'aspect-[1.414/1] text-[5px]';
  const pageClass = `relative h-full w-full overflow-hidden bg-white shadow-sm ${scaleClass}`;

  if (template.id === 'MODERN_001') {
    return (
      <div className={pageClass}>
        <div className="absolute inset-y-0 left-0 w-[18%] bg-slate-900" />
        <div className="absolute inset-y-0 left-[18%] w-[1.8%] bg-blue-500" />
        <div className="absolute left-[28%] top-[18%] w-[62%]">
          <p className="text-[2.7em] font-black uppercase leading-none tracking-normal text-blue-500">Certificate</p>
          <p className="mt-[0.2em] text-[1.1em] font-black uppercase tracking-[0.12em] text-slate-800">of completion</p>
          <p className="mt-[3.2em] text-[0.95em] font-bold text-slate-500">This is to certify that</p>
          <p className="mt-[0.25em] text-[3.2em] font-black leading-none text-slate-950">{demo.learnerName}</p>
          <p className="mt-[1.4em] text-[0.95em] font-bold text-slate-500">has successfully completed the course</p>
          <p className="mt-[0.25em] text-[1.8em] font-black leading-tight text-slate-800">{demo.courseTitle}</p>
        </div>
        <div className="absolute bottom-[10%] left-[28%] text-[0.75em] font-bold text-slate-500">
          <p>{demo.certificateNo}</p>
          <p>{demo.issuedAt}</p>
        </div>
      </div>
    );
  }

  if (template.id === 'MINIMAL_001') {
    return (
      <div className={pageClass}>
        <div className="absolute inset-x-[18%] top-[22%] h-px bg-slate-200" />
        <div className="absolute inset-x-[18%] bottom-[22%] h-px bg-slate-100" />
        <div className="absolute inset-x-[10%] top-[25%] text-center">
          <p className="text-[1.45em] font-black uppercase tracking-[0.22em] text-slate-600">Certificate of Achievement</p>
          <p className="mt-[3em] text-[0.78em] font-black uppercase tracking-[0.18em] text-slate-400">Presented to</p>
          <p className="mt-[0.2em] text-[3.6em] font-black leading-none text-slate-950">{demo.learnerName}</p>
          <p className="mt-[2.8em] text-[0.78em] font-black uppercase tracking-[0.18em] text-slate-400">For completing</p>
          <p className="mt-[0.2em] text-[1.65em] font-black text-slate-700">{demo.courseTitle}</p>
        </div>
        <div className="absolute bottom-[10%] left-[10%] right-[10%] flex justify-between text-[0.7em] font-bold text-slate-400">
          <span>{demo.certificateNo}</span>
          <span>{demo.issuedAt}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${pageClass} bg-[#fdfcf8]`}>
      <div className="absolute inset-[3%] border-[0.35em] border-[#1a3a5a]" />
      <div className="absolute inset-[6%] border border-[#d4af37]" />
      <div className="absolute inset-x-[8%] top-[19%] text-center">
        <p className="text-[2em] font-black uppercase tracking-normal text-[#1a3a5a]">Certificate of Completion</p>
        <p className="mt-[2em] text-[0.95em] font-bold text-slate-600">หนังสือรับรองฉบับนี้ ให้ไว้เพื่อแสดงว่า</p>
        <p className="mt-[0.35em] text-[3.7em] font-black leading-none text-slate-950">{demo.learnerName}</p>
        <p className="mt-[1.65em] text-[1.05em] font-bold text-slate-600">ได้ผ่านการเรียนหลักสูตรออนไลน์</p>
        <p className="mt-[0.35em] text-[2em] font-black leading-tight text-[#1a3a5a]">{demo.courseTitle}</p>
      </div>
      <div className="absolute bottom-[12%] left-[10%] text-[0.75em] font-bold text-slate-500">
        <p>เลขที่เกียรติบัตร: {demo.certificateNo}</p>
        <p>วันที่ออก: {demo.issuedAt}</p>
      </div>
      <p className="absolute bottom-[8%] right-[10%] text-[0.65em] font-bold text-slate-400">ScaleUp Learning Management System</p>
    </div>
  );
};

const TemplateCard = ({ template, isSelected, onSelect, onPreview }) => {
  const handlePreview = (event) => {
    event.stopPropagation();
    onPreview(template);
  };

  return (
    <div 
      onClick={() => onSelect(template.id)}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
        isSelected 
          ? 'border-primary bg-primary/5 ring-4 ring-primary/10 shadow-lg' 
          : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
      }`}
    >
      {/* Visual Preview (CSS Based) */}
      <div className="aspect-[1.4/1] w-full overflow-hidden bg-slate-50 p-3">
        <div className={`h-full w-full overflow-hidden rounded border ${template.id === 'CLASSIC_001' ? 'border-amber-200' : 'border-slate-200'}`}>
          <CertificateArtwork template={template} />
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h5 className={`font-black text-sm ${isSelected ? 'text-primary' : 'text-slate-900'}`}>
            {template.name}
          </h5>
          {isSelected && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
              <Check size={12} strokeWidth={4} />
            </div>
          )}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500 line-clamp-2 font-medium">
          {template.description}
        </p>
      </div>

      {/* Hover Overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-start justify-end bg-slate-950/0 p-3 transition-all duration-200 group-hover:bg-slate-950/10 group-focus-within:bg-slate-950/10">
        <button
          type="button"
          onClick={handlePreview}
          className="pointer-events-auto inline-flex translate-y-1 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-800 opacity-0 shadow-lg shadow-slate-900/10 ring-1 ring-slate-200 transition-all duration-200 hover:bg-slate-900 hover:text-white focus:translate-y-0 focus:opacity-100 group-hover:translate-y-0 group-hover:opacity-100"
          aria-label={`Preview ${template.name}`}
        >
          <Eye size={13} />
          Preview
        </button>
      </div>
    </div>
  );
};

export { CertificateArtwork };
export default TemplateCard;
