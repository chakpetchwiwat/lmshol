import { formatThaiDateTime } from '../../../utils/dateUtils';

export const emptyCertificateForm = {
  title: '',
  issuer: '',
  issueDate: '',
  expirationDate: '',
  noExpiration: true,
  credentialId: '',
  credentialUrl: '',
  fileUrl: '',
  fileKey: '',
  fileName: '',
  fileMimeType: ''
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
  issueDate: toDateInputValue(certificate?.issueDate),
  expirationDate: toDateInputValue(certificate?.expirationDate),
  noExpiration: certificate?.noExpiration ?? !certificate?.expirationDate,
  credentialId: certificate?.credentialId || '',
  credentialUrl: certificate?.credentialUrl || '',
  fileUrl: certificate?.fileUrl || '',
  fileKey: certificate?.fileKey || '',
  fileName: certificate?.fileName || '',
  fileMimeType: certificate?.fileMimeType || ''
});

export const formatCertificateDateRange = (certificate) => {
  const issued = certificate.issueDate ? formatThaiDateTime(certificate.issueDate) : 'ไม่ระบุวันที่ออก';
  if (certificate.noExpiration) return `${issued} - ไม่มีวันหมดอายุ`;
  if (certificate.expirationDate) return `${issued} - ${formatThaiDateTime(certificate.expirationDate)}`;
  return issued;
};

export const sortCertificatesByIssueDate = (certificates) => (
  [...certificates].sort((a, b) => {
    const aDate = a.issueDate ? new Date(a.issueDate).getTime() : 0;
    const bDate = b.issueDate ? new Date(b.issueDate).getTime() : 0;
    return bDate - aDate;
  })
);
