import { formatThaiDateTime } from './dateUtils';

const REPORT_STORAGE_PREFIX = 'print-report:';
const REPORT_TTL_MS = 1000 * 60 * 60;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderMetaRow = (items = []) => {
  const visibleItems = items.filter(
    (item) => item?.label && item?.value !== undefined && item?.value !== null && item?.value !== ''
  );

  if (!visibleItems.length) return '';

  return `
    <div class="meta-grid">
      ${visibleItems
        .map(
          (item) => `
            <div class="meta-card">
              <div class="meta-label">${escapeHtml(item.label)}</div>
              <div class="meta-value">${escapeHtml(item.value)}</div>
            </div>
          `
        )
        .join('')}
    </div>
  `;
};

const renderTable = ({ columns = [], rows = [], emptyMessage = 'ไม่พบข้อมูล' }) => `
  <div class="table-shell">
    <table>
      <thead>
        <tr>
          ${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${
          rows.length > 0
            ? rows
                .map(
                  (row) => `
                    <tr>
                      ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}
                    </tr>
                  `
                )
                .join('')
            : `
                <tr>
                  <td class="empty-cell" colspan="${Math.max(columns.length, 1)}">${escapeHtml(emptyMessage)}</td>
                </tr>
              `
        }
      </tbody>
    </table>
  </div>
`;

const normalizeReportData = (report = {}) => ({
  type: report.type || 'table',
  fileName: report.fileName || 'report',
  reportTitle: report.reportTitle || 'รายงาน',
  subtitle: report.subtitle || '',
  summary: Array.isArray(report.summary) ? report.summary : [],
  filters: Array.isArray(report.filters) ? report.filters : [],
  columns: Array.isArray(report.columns) ? report.columns : [],
  rows: Array.isArray(report.rows) ? report.rows : [],
  emptyMessage: report.emptyMessage || 'ไม่พบข้อมูล',
  dashboardData: report.dashboardData || null,
  generatedAt: report.generatedAt || formatThaiDateTime(new Date(), true),
});

export const getPrintReportStyles = () => `
  :root {
    color-scheme: light;
    --ink: #0f172a;
    --muted: #64748b;
    --line: #dbe4f0;
    --surface: #ffffff;
    --surface-alt: #f8fafc;
    --brand: #4338ca;
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
    font-family: "Kanit", "Segoe UI", Tahoma, sans-serif;
    color: var(--ink);
    background: #eef2ff;
  }

  body {
    min-height: 100vh;
  }

  .print-shell {
    padding: 24px;
  }

  .page {
    width: 100%;
    max-width: 1120px;
    margin: 0 auto;
    background: var(--surface);
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 24px;
    box-shadow: 0 24px 70px -36px rgba(15, 23, 42, 0.28);
    overflow: hidden;
  }

  .header {
    padding: 28px 32px 22px;
    background: linear-gradient(135deg, #eef2ff 0%, #ffffff 52%, #f8fafc 100%);
    border-bottom: 1px solid var(--line);
  }

  .eyebrow {
    display: inline-block;
    margin-bottom: 8px;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(67, 56, 202, 0.08);
    color: var(--brand);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: 28px;
    line-height: 1.2;
    font-weight: 800;
  }

  .subtitle {
    margin-top: 8px;
    font-size: 15px;
    color: var(--muted);
  }

  .generated-at {
    margin-top: 12px;
    font-size: 13px;
    color: var(--muted);
  }

  .section {
    padding: 24px 32px 0;
  }

  .section:last-of-type {
    padding-bottom: 32px;
  }

  .section-title {
    margin: 0 0 14px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    border: 1px solid var(--line);
    border-radius: 20px;
    background: var(--surface);
    overflow: hidden;
  }

  .meta-card {
    padding: 20px 24px;
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    background: var(--surface);
    display: flex;
    flex-direction: column;
  }

  .meta-card:last-child {
    border-right: none;
  }

  .meta-card:nth-child(even) {
    background: var(--surface-alt);
  }

  .meta-label {
    margin-bottom: 10px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .meta-value {
    font-size: 16px;
    font-weight: 700;
    line-height: 1.5;
    color: var(--ink);
    white-space: pre-line;
  }

  .table-shell {
    border: 1px solid var(--line);
    border-radius: 20px;
    overflow: hidden;
    background: var(--surface);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    background: var(--surface-alt);
  }

  th, td {
    padding: 13px 16px;
    border-bottom: 1px solid var(--line);
    text-align: left;
    vertical-align: top;
    font-size: 13px;
    line-height: 1.55;
    white-space: pre-line;
  }

  th {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  .empty-cell {
    text-align: center;
    color: var(--muted);
    padding: 28px 16px;
  }

  @page {
    size: A4 landscape;
    margin: 12mm;
  }

  @media print {
    html, body {
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-shell {
      padding: 0;
    }

    .page {
      width: 100%;
      max-width: none;
      border: none;
      border-radius: 0;
      box-shadow: none;
      overflow: visible;
    }
  }
`;

export const renderPrintReportMarkup = (report) => {
  const data = normalizeReportData(report);
  const safeTitle = escapeHtml(data.reportTitle);
  const safeSubtitle = data.subtitle ? escapeHtml(data.subtitle) : '';

  return `
    <main class="page">
      <header class="header">
        <div class="eyebrow">Print to PDF</div>
        <h1>${safeTitle}</h1>
        ${safeSubtitle ? `<div class="subtitle">${safeSubtitle}</div>` : ''}
        <div class="generated-at">สร้างเอกสารเมื่อ ${escapeHtml(data.generatedAt)}</div>
      </header>

      <section class="section">
        <h2 class="section-title">สรุปข้อมูล</h2>
        ${renderMetaRow(data.summary)}
      </section>

      ${
        data.filters.length
          ? `
            <section class="section">
              <h2 class="section-title">ตัวกรองที่ใช้</h2>
              ${renderMetaRow(data.filters)}
            </section>
          `
          : ''
      }

      <section class="section">
        <h2 class="section-title">รายละเอียดรายการ</h2>
        ${renderTable({
          columns: data.columns,
          rows: data.rows,
          emptyMessage: data.emptyMessage,
        })}
      </section>
    </main>
  `;
};

const getStorageKey = (reportId) => `${REPORT_STORAGE_PREFIX}${reportId}`;

const cleanupExpiredReports = () => {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  const keysToDelete = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(REPORT_STORAGE_PREFIX)) continue;

    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || '{}');
      if (!parsed?.createdAt || now - parsed.createdAt > REPORT_TTL_MS) {
        keysToDelete.push(key);
      }
    } catch {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => window.localStorage.removeItem(key));
};

const buildPrintReportUrl = (reportId) => {
  const baseUrl = new URL(import.meta.env.BASE_URL || '/', window.location.origin);
  return new URL(`print/report/${encodeURIComponent(reportId)}`, baseUrl).toString();
};

export const getPrintReportDocumentTitle = (fileName = 'report') => `${fileName}.pdf`;

export const getStoredPrintReport = (reportId) => {
  if (typeof window === 'undefined' || !reportId) {
    return null;
  }

  cleanupExpiredReports();

  try {
    const raw = window.localStorage.getItem(getStorageKey(reportId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return normalizeReportData(parsed);
  } catch {
    return null;
  }
};

export const openPrintReport = ({
  type = 'table',
  fileName = 'report',
  reportTitle,
  subtitle,
  summary = [],
  filters = [],
  columns = [],
  rows = [],
  emptyMessage,
  dashboardData = null,
}) => {
  if (typeof window === 'undefined') {
    return;
  }

  cleanupExpiredReports();

  const reportId = `report-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const payload = {
    type,
    fileName,
    reportTitle,
    subtitle,
    summary,
    filters,
    columns,
    rows,
    emptyMessage,
    dashboardData,
    generatedAt: formatThaiDateTime(new Date(), true),
    createdAt: Date.now(),
  };

  try {
    window.localStorage.setItem(getStorageKey(reportId), JSON.stringify(payload));
  } catch {
    window.alert('ไม่สามารถเตรียมเอกสารสำหรับพิมพ์ได้ กรุณาลองใหม่อีกครั้ง');
    return;
  }

  const link = document.createElement('a');
  link.href = buildPrintReportUrl(reportId);
  link.target = '_blank';
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
