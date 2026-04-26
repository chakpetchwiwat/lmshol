import React from 'react';
import { Building2, Calendar, ExternalLink, FileText, Pencil, Trash2 } from 'lucide-react';
import { formatCertificateDateRange } from './certificateForm.utils';

const ProfileCertificateCard = ({ certificate, onEdit, onDelete }) => (
  <article className="group px-5 py-4 transition-colors hover:bg-slate-50/70">
    <div className="flex gap-4">
      <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-primary">
        <FileText size={21} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h5 className="break-words text-sm font-black text-slate-900">{certificate.title}</h5>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <Building2 size={14} />
              <span className="truncate">{certificate.issuer}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(certificate)}
              aria-label={`แก้ไข ${certificate.title}`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-primary"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(certificate.id)}
              aria-label={`ลบ ${certificate.title}`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-danger"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Calendar size={14} />
          {formatCertificateDateRange(certificate)}
        </p>

        {(certificate.credentialId || certificate.credentialUrl || certificate.fileUrl) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {certificate.credentialId && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600">
                ID: {certificate.credentialId}
              </span>
            )}
            {certificate.credentialUrl && (
              <a
                href={certificate.credentialUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-primary transition-colors hover:bg-indigo-100"
              >
                Credential URL
                <ExternalLink size={13} />
              </a>
            )}
            {certificate.fileUrl && (
              <a
                href={certificate.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                {certificate.fileName || 'ไฟล์แนบ'}
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  </article>
);

export default ProfileCertificateCard;
