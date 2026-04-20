import { formatThaiDateTime } from './dateUtils';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const renderMetaRow = (items = []) => {
  const visibleItems = items.filter((item) => item?.label && item?.value !== undefined && item?.value !== null && item?.value !== '');
  if (!visibleItems.length) return '';

  return `
    <div class="meta-grid">
      ${visibleItems.map((item) => `
        <div class="meta-card">
          <div class="meta-label">${escapeHtml(item.label)}</div>
          <div class="meta-value">${escapeHtml(item.value)}</div>
        </div>
      `).join('')}
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
        ${rows.length > 0
          ? rows.map((row) => `
              <tr>
                ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}
              </tr>
            `).join('')
          : `
              <tr>
                <td class="empty-cell" colspan="${Math.max(columns.length, 1)}">${escapeHtml(emptyMessage)}</td>
              </tr>
            `}
      </tbody>
    </table>
  </div>
`;

export const openPrintReport = ({
  fileName = 'report',
  reportTitle,
  subtitle,
  summary = [],
  filters = [],
  columns = [],
  rows = [],
  emptyMessage,
}) => {
  if (typeof window === 'undefined') {
    return;
  }

  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
  if (!printWindow) {
    window.alert('ไม่สามารถเปิดหน้าต่างสำหรับพิมพ์ได้ กรุณาอนุญาต pop-up แล้วลองใหม่อีกครั้ง');
    return;
  }

  const generatedAt = formatThaiDateTime(new Date(), true);
  const safeTitle = escapeHtml(reportTitle || 'รายงาน');
  const safeSubtitle = subtitle ? escapeHtml(subtitle) : '';
  const titleForDocument = `${fileName}.pdf`;

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html lang="th">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(titleForDocument)}</title>
        <style>
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
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
          }

          .meta-card {
            min-height: 88px;
            padding: 14px 16px;
            border: 1px solid var(--line);
            border-radius: 18px;
            background: var(--surface-alt);
          }

          .meta-label {
            margin-bottom: 8px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--muted);
          }

          .meta-value {
            font-size: 18px;
            font-weight: 700;
            line-height: 1.4;
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
            }

            body {
              padding: 0;
            }

            .page {
              max-width: none;
              border: none;
              border-radius: 0;
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <header class="header">
            <div class="eyebrow">Print to PDF</div>
            <h1>${safeTitle}</h1>
            ${safeSubtitle ? `<div class="subtitle">${safeSubtitle}</div>` : ''}
            <div class="generated-at">สร้างเอกสารเมื่อ ${escapeHtml(generatedAt)}</div>
          </header>

          <section class="section">
            <h2 class="section-title">สรุปข้อมูล</h2>
            ${renderMetaRow(summary)}
          </section>

          ${filters.length ? `
            <section class="section">
              <h2 class="section-title">ตัวกรองที่ใช้</h2>
              ${renderMetaRow(filters)}
            </section>
          ` : ''}

          <section class="section">
            <h2 class="section-title">รายละเอียดรายการ</h2>
            ${renderTable({ columns, rows, emptyMessage })}
          </section>
        </main>
      </body>
    </html>
  `);
  printWindow.document.close();

  const triggerPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  if (printWindow.document.readyState === 'complete') {
    setTimeout(triggerPrint, 250);
  } else {
    printWindow.onload = () => setTimeout(triggerPrint, 250);
  }
};
