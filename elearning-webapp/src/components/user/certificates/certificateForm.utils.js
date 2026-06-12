import { formatThaiDateTime } from '../../../utils/dateUtils';

export const emptyCertificateForm = {
  title: '',
  issuer: '',
  startDate: '',
  issueDate: '',
  expirationDate: '',
  noExpiration: true,
  credentialId: '',
  credentialUrl: '',
  fileUrl: '',
  fileKey: '',
  fileName: '',
  fileMimeType: '',
  trainingType: 'external',
  trainingItem: 'unclassified',
  trainingDetails: '',
  trainingVenue: '',
  trainingDays: '',
  intakeNo: '',
  competencies: []
};

const toDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

export const buildFormFromCertificate = (certificate) => ({
  title: certificate?.title || '',
  issuer: certificate?.issuer || '',
  startDate: toDateInputValue(certificate?.startDate),
  issueDate: toDateInputValue(certificate?.issueDate),
  expirationDate: toDateInputValue(certificate?.expirationDate),
  noExpiration: certificate?.noExpiration ?? !certificate?.expirationDate,
  credentialId: certificate?.credentialId || '',
  credentialUrl: certificate?.credentialUrl || '',
  fileUrl: certificate?.fileUrl || '',
  fileKey: certificate?.fileKey || '',
  fileName: certificate?.fileName || '',
  fileMimeType: certificate?.fileMimeType || '',
  trainingType: certificate?.trainingType || 'external',
  trainingItem: certificate?.trainingItem || 'unclassified',
  trainingDetails: certificate?.trainingDetails || '',
  trainingVenue: certificate?.trainingVenue || '',
  trainingDays: certificate?.trainingDays || '',
  intakeNo: certificate?.intakeNo || '',
  competencies: (certificate?.competencies || []).map((mapping) => ({
    competencyId: mapping.competencyId,
    requiredLevel: mapping.requiredLevel || '',
    note: mapping.note || ''
  }))
});

export const formatCertificateDateRange = (certificate, isLms = false) => {
  const issueDate = isLms ? certificate.issuedAt : certificate.issueDate;
  const startDate = isLms ? null : certificate.startDate;
  const expirationDate = isLms ? certificate.expiresAt : certificate.expirationDate;
  const noExpiration = isLms ? !certificate.expiresAt : certificate.noExpiration;

  const startStr = startDate ? formatThaiDateTime(startDate) : '';
  const endStr = issueDate ? formatThaiDateTime(issueDate) : 'ไม่ระบุวันที่ออก';
  
  let dateRange = '';
  if (startStr && startStr !== endStr) {
    dateRange = `${startStr} - ${endStr}`;
  } else {
    dateRange = endStr;
  }

  if (noExpiration) return `${dateRange} · ไม่มีวันหมดอายุ`;
  if (expirationDate) return `${dateRange} · หมดอายุ: ${formatThaiDateTime(expirationDate)}`;
  return dateRange;
};

export const sortCertificatesByIssueDate = (certificates) => (
  [...certificates].sort((a, b) => {
    const aDate = a.issueDate ? new Date(a.issueDate).getTime() : 0;
    const bDate = b.issueDate ? new Date(b.issueDate).getTime() : 0;
    return bDate - aDate;
  })
);
