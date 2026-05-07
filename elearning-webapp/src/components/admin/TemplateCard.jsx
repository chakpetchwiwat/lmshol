import React from 'react';
import { Check, Eye } from 'lucide-react';
import { getFullUrl } from '../../utils/api';

const CertificateArtwork = ({ template, size = 'card', signatureSlots = [] }) => {
  const isFull = size === 'full';
  const activeSlots = (signatureSlots || []).filter(s => s && s.enabled !== false).slice(0, 2);

  const demo = {
    learnerName: 'Alex Morgan',
    courseTitle: 'Advanced Workplace Learning',
    certificateNo: 'CERT-2026-0427',
    issuedAt: '03 May 2026'
  };

  const SignatureArea = ({ alignment = 'right' }) => {
    if (activeSlots.length === 0) return null;
    return (
      <div className={`absolute bottom-[10%] ${
        alignment === 'right' ? 'right-[8%] justify-end' : 
        alignment === 'center' ? 'left-0 right-0 justify-center' : 
        'left-[10%] justify-start'
      } flex w-[36%] items-end gap-[1.8em]`}>
        {activeSlots.map((slot, i) => (
          <div key={slot.id || i} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
            {slot.stampImageUrl ? (
              <img src={getFullUrl(slot.stampImageUrl)} alt="" className="absolute bottom-[1.8em] right-[8%] h-[2.6em] w-[2.6em] object-contain opacity-80" />
            ) : null}
            <div className="relative mb-[0.2em] flex h-[2.5em] w-full items-end justify-center border-b border-slate-300 pb-1">
              {slot.signatureImageUrl ? (
                <img src={getFullUrl(slot.signatureImageUrl)} alt="" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-[0.5em] font-black uppercase italic tracking-widest text-slate-200">Signature</span>
              )}
            </div>
            <p className="max-w-full truncate text-[0.65em] font-black text-slate-800">{slot.name || `Signature ${i + 1}`}</p>
            <p className="max-w-full truncate text-[0.5em] font-bold text-slate-400">{slot.title || 'Title'}</p>
          </div>
        ))}
      </div>
    );
  };

  const scaleClass = isFull
    ? 'aspect-[1.414/1] text-[clamp(8px,1.1vw,15px)]'
    : 'aspect-[1.414/1] text-[5px]';
  const pageClass = `relative h-full w-full overflow-hidden bg-white shadow-sm ${scaleClass}`;

  if (template.id === 'MODERN_001') {
    return (
      <div className={pageClass}>
        {/* Top-left accent line */}
        <div className="absolute left-[10%] top-[14%] h-[1.2%] w-[15%] bg-blue-500" />
        
        <div className="absolute left-[10%] top-[25%] w-[80%]">
          <p className="text-[2.8em] font-black uppercase leading-none tracking-tight text-blue-500">Certificate</p>
          <p className="mt-[0.3em] text-[1.1em] font-black uppercase tracking-[0.12em] text-blue-400">of completion</p>
          
          <p className="mt-[2.8em] text-[0.9em] font-bold text-slate-400">This is to certify that</p>
          <div className="mt-[0.2em] relative inline-block">
            <p className="text-[3.4em] font-black leading-none text-slate-900">{demo.learnerName}</p>
            <div className="absolute -bottom-2 left-0 w-1/2 h-[1px] bg-slate-200" />
          </div>
          
          <p className="mt-[3.2em] text-[0.9em] font-bold text-slate-400">has successfully completed the course</p>
          <p className="mt-[0.25em] text-[1.9em] font-black leading-tight text-slate-800">{demo.courseTitle}</p>
        </div>

        {/* Metadata Box (Bottom Left) */}
        <div className="absolute bottom-[10%] left-[10%] w-[45%] rounded-lg bg-slate-50 p-[1.5%] shadow-sm overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-[3%] bg-blue-500" />
          <div className="grid grid-cols-[1fr_2fr] gap-x-2 text-[0.6em] font-bold">
            <span className="text-slate-400">Certificate No</span>
            <span className="text-slate-700">{demo.certificateNo}</span>
            <span className="text-slate-400">Issue Date</span>
            <span className="text-slate-700">{demo.issuedAt}</span>
          </div>
        </div>

        <SignatureArea alignment="right" />
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

        <SignatureArea alignment="center" />
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
      
      <SignatureArea alignment="right" />
      
      <p className="absolute bottom-[4%] left-0 right-0 text-center text-[0.55em] font-bold text-slate-300">ScaleUp Learning Management System</p>
    </div>
  );
};

const TemplateCard = ({ template, isSelected, onSelect, onPreview, signatureSlots = [] }) => {
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
          <CertificateArtwork template={template} signatureSlots={signatureSlots} />
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
