import React from 'react';
import { Building2, Calendar, ExternalLink, FileText, Pencil, Trash2 } from 'lucide-react';
import { userAPI } from '../../../utils/api';
import { formatCertificateDateRange } from './certificateForm.utils';

const ProfileCertificateCard = ({ certificate, isLms, onEdit, onDelete }) => {
  const [downloading, setDownloading] = React.useState(false);
  const lmsMetadata = certificate.metadata?.snapshot || certificate.metadata || {};
  const title = isLms ? (lmsMetadata.course?.title || certificate.courseTitle || 'Course Certificate') : certificate.title;
  const issuer = isLms ? (lmsMetadata.signer?.name || 'LMS System') : certificate.issuer;
  const displayId = isLms ? certificate.certificateNo : certificate.credentialId;
  const fileUrl = isLms ? certificate.pdfUrl : certificate.fileUrl;
  const dateLabel = formatCertificateDateRange(certificate, isLms);

  const handleDownload = async () => {
    if (!certificate.id) return;
    
    try {
      setDownloading(true);
      const response = isLms 
        ? await userAPI.getCertificateDownloadUrl(certificate.id)
        : await userAPI.getUploadedCertificateDownloadUrl(certificate.id);

      if (response.data?.url) {
        window.open(response.data.url, '_blank');
      } else {
        throw new Error('Download URL not found');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('ไม่สามารถเปิดไฟล์เกียรติบัตรได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <article className="group px-5 py-5 transition-colors hover:bg-slate-50/70">
      <div className="flex gap-4">
        <div className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isLms ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-primary'}`}>
          <FileText size={21} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h5 className="break-words text-sm font-black text-slate-900">{title}</h5>
                {isLms && (
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    certificate.status === 'VALID' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : certificate.status === 'REVOKED'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {certificate.status}
                  </span>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <Building2 size={14} />
                <span className="truncate">{issuer}</span>
              </p>
            </div>
            
            {!isLms && (onEdit || onDelete) && (
              <div className="flex shrink-0 items-center gap-1">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(certificate)}
                    aria-label={`แก้ไข ${title}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-primary"
                  >
                    <Pencil size={15} />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(certificate.id)}
                    aria-label={`ลบ ${title}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )}
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Calendar size={14} />
            {dateLabel}
          </p>

          {(displayId || certificate.credentialUrl || fileUrl) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {displayId && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600">
                  {isLms ? 'No: ' : 'ID: '}{displayId}
                </span>
              )}
              {!isLms && certificate.credentialUrl && (
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
              
              {isLms ? (
                certificate.status === 'VALID' && (
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
                  >
                    {downloading ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                    ) : (
                      <FileText size={13} />
                    )}
                    ดูเกียรติบัตร
                    <ExternalLink size={13} />
                  </button>
                )
              ) : (
                (fileUrl || certificate.fileKey) && (
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {downloading ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                    ) : (
                      <FileText size={13} />
                    )}
                    {certificate.fileName || 'ไฟล์แนบ'}
                    <ExternalLink size={13} />
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProfileCertificateCard;
