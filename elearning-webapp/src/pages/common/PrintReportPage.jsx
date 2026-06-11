import React from 'react';
import { ExternalLink, Printer } from 'lucide-react';
import { useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getPrintReportDocumentTitle,
  getPrintReportStyles,
  getStoredPrintReport,
  renderPrintReportMarkup,
} from '../../utils/printUtils';
import { formatThaiDateTime } from '../../utils/dateUtils';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const PIE_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

const DashboardPrintContent = ({ report }) => {
  const dashboardData = report.dashboardData || {};
  const {
    weeklyActivity = [],
    typeDistribution = [],
    skillGap = [],
    performanceRows = [],
    goals = [],
  } = dashboardData;

  return (
    <div className="dashboard-print page">
      <header className="header">
        <div className="eyebrow">Print to PDF</div>
        <h1>{report.reportTitle}</h1>
        {report.subtitle ? <div className="subtitle">{report.subtitle}</div> : null}
        <div className="generated-at">สร้างเอกสารเมื่อ {report.generatedAt}</div>
      </header>

      <section className="section">
        <h2 className="section-title">สรุปข้อมูล</h2>
        <div className="meta-grid">
          {(report.summary || []).map((item) => (
            <div key={item.label} className="meta-card">
              <div className="meta-label">{item.label}</div>
              <div className="meta-value">{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      {goals.length > 0 && (
        <section className="section">
          <h2 className="section-title">Active Goal Overview</h2>
          <div className="goal-print-grid">
            {goals.map((goal, index) => (
              <div key={index} className="goal-print-card">
                <div className="goal-print-header">
                  <div className="goal-print-title">{goal.title}</div>
                  <div className="goal-print-meta">
                    <span>Target: {goal.targetLabel}</span>
                    <span className="separator">•</span>
                    <span>Scope: {goal.scopeLabel}</span>
                  </div>
                </div>
                <div className="goal-print-stats">
                  <div className="goal-print-stat-item">
                    <div className="label">สำเร็จแล้ว</div>
                    <div className="value success">{goal.counts?.COMPLETED || 0}</div>
                  </div>
                  <div className="goal-print-stat-item">
                    <div className="label">กำลังเรียน</div>
                    <div className="value warning">{goal.counts?.IN_PROGRESS || 0}</div>
                  </div>
                  <div className="goal-print-stat-item">
                    <div className="label">ยังไม่เริ่ม</div>
                    <div className="value danger">{goal.counts?.NOT_STARTED || 0}</div>
                  </div>
                  <div className="goal-print-stat-item">
                    <div className="label">ทั้งหมด</div>
                    <div className="value muted">{goal.counts?.ALL || 0}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(report.filters || []).length ? (
        <section className="section">
          <h2 className="section-title">ตัวกรองที่ใช้</h2>
          <div className="meta-grid">
            {report.filters.map((item) => (
              <div key={item.label} className="meta-card">
                <div className="meta-label">{item.label}</div>
                <div className="meta-value">{item.value}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <h2 className="section-title">Dashboard Charts</h2>
        <div className="dashboard-chart-grid">
          <div className="dashboard-chart-card">
            <div className="dashboard-chart-title">กิจกรรมการเริ่มเรียน</div>
            <div className="dashboard-chart-shell">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyActivity} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 2, 2]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="dashboard-chart-card">
            <div className="dashboard-chart-title">การกระจายตาม competency group</div>
            <div className="dashboard-chart-shell">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={4}
                    isAnimationActive={false}
                  >
                    {typeDistribution.map((entry, index) => (
                      <Cell key={entry.type || entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="dashboard-legend">
              {typeDistribution.map((item, index) => (
                <div key={item.type || item.name} className="dashboard-legend-item">
                  <span className="dashboard-dot" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                  <span className="dashboard-legend-label">{item.name}</span>
                  <span className="dashboard-legend-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-chart-card">
            <div className="dashboard-chart-title">Skill Gap</div>
            <div className="dashboard-chart-shell">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillGap.map((item) => ({ ...item, label: item.label || item.type?.replace('STRAT_', '') }))} margin={{ top: 10, right: 16, left: -20, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} angle={-18} textAnchor="end" height={56} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="average_mastery" fill="#0f766e" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <section className="section dashboard-table-section">
        <h2 className="section-title">รายชื่อผลการเรียน</h2>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>ผู้เรียน</th>
                <th>แผนก</th>
                <th>คอร์ส</th>
                <th>หมวดหมู่</th>
                <th>สถานะ</th>
                <th>คะแนน</th>
                <th>เริ่มเรียน</th>
                <th>จบเมื่อ</th>
              </tr>
            </thead>
            <tbody>
              {performanceRows.length > 0 ? performanceRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.userName || '-'}</td>
                  <td>{row.department || '-'}</td>
                  <td>{row.courseTitle || '-'}</td>
                  <td>{row.categoryName || '-'}</td>
                  <td>{row.statusLabel || row.status || '-'}</td>
                  <td>{row.score ?? '-'}</td>
                  <td>{row.startedAt ? formatThaiDateTime(row.startedAt, true) : '-'}</td>
                  <td>{row.completedAt ? formatThaiDateTime(row.completedAt, true) : '-'}</td>
                </tr>
              )) : (
                <tr>
                  <td className="empty-cell" colSpan={8}>ไม่มีข้อมูลผลการเรียนสำหรับตัวกรองนี้</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const PdfBackgroundCanvas = ({ pdfDocument }) => {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      if (!pdfDocument || !canvasRef.current) return;
      const page = await pdfDocument.getPage(1);
      if (cancelled || !canvasRef.current) return;

      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { alpha: false });
      const outputScale = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

      const renderTask = page.render({
        canvasContext: context,
        viewport,
      });

      try {
        await renderTask.promise;
      } catch (error) {
        if (error?.name !== 'RenderingCancelledException') {
          throw error;
        }
      }
    };

    renderPage().catch((error) => {
      console.error('PdfBackgroundCanvas render error:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [pdfDocument]);

  return <canvas ref={canvasRef} className="pdf-bg-canvas" />;
};

const CustomFormPrintContent = ({ report }) => {
  const [pdfDocument, setPdfDocument] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let active = true;
    const loadPdf = async () => {
      try {
        const url = '/F-D3-14_3.pdf';
        const loadingTask = getDocument({
          url,
          withCredentials: false,
        });
        const loadedPdf = await loadingTask.promise;
        if (active) {
          setPdfDocument(loadedPdf);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load PDF background template:', err);
        if (active) {
          setError('ไม่สามารถโหลดเทมเพลต PDF ได้');
          setLoading(false);
        }
      }
    };
    loadPdf();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        <p className="text-sm font-semibold">กำลังโหลดเทมเพลตแบบฟอร์ม...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-20 text-red-600 font-semibold">
        {error}
      </div>
    );
  }

  const name = report.profile?.name || '';
  const subdivision = report.profile?.subdivision || '';
  const department = report.profile?.department || '';

  let cleanSub = subdivision.trim();
  if (cleanSub && !cleanSub.startsWith('กลุ่ม')) {
    cleanSub = 'กลุ่ม' + cleanSub;
  }
  const cleanDept = department.trim();
  const subdivisionText = cleanSub 
    ? `${cleanSub} ${cleanDept} สำนักงานคณะกรรมการอาหารและยา`
    : `${cleanDept} สำนักงานคณะกรรมการอาหารและยา`;

  const records = report.profile?.customFormRows || report.rows || [];
  const pageSize = 33;
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));

  const pages = [];
  for (let p = 0; p < totalPages; p++) {
    pages.push(records.slice(p * pageSize, (p + 1) * pageSize));
  }

  return (
    <div className="custom-form-print">
      <style>{`
        @font-face {
          font-family: 'TH Sarabun PSK';
          src: url('/fonts/THSarabun.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'TH Sarabun PSK';
          src: url('/fonts/THSarabun Bold.ttf') format('truetype');
          font-weight: bold;
          font-style: normal;
        }
        @font-face {
          font-family: 'TH Sarabun PSK';
          src: url('/fonts/THSarabun Italic.ttf') format('truetype');
          font-weight: normal;
          font-style: italic;
        }
        @font-face {
          font-family: 'TH Sarabun PSK';
          src: url('/fonts/THSarabun BoldItalic.ttf') format('truetype');
          font-weight: bold;
          font-style: italic;
        }

        .custom-form-print {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #eef2ff;
          padding: 20px 0;
          min-height: 100vh;
        }

        .custom-form-page {
          position: relative;
          width: 595.32pt;
          height: 841.92pt;
          background: white;
          margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
          overflow: hidden;
          box-sizing: border-box;
        }

        .pdf-bg-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 595.32pt;
          height: 841.92pt;
          z-index: 1;
        }

        .form-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 595.32pt;
          height: 841.92pt;
          z-index: 5;
          pointer-events: none;
          font-family: 'TH Sarabun PSK', sans-serif;
          color: black;
        }

        .overlay-text {
          position: absolute;
          line-height: 1;
        }

        .overlay-name {
          left: 65pt;
          top: 67pt;
          font-size: 16pt;
          font-weight: bold;
        }

        .subdivision-mask {
          position: absolute;
          left: 35pt;
          top: 83.5pt;
          width: 520pt;
          height: 18pt;
          background: white;
          z-index: 2;
        }

        .overlay-subdivision {
          left: 36pt;
          top: 84.5pt;
          font-size: 16pt;
          font-weight: bold;
          z-index: 3;
        }

        .table-row-overlay {
          position: absolute;
          left: 30pt;
          width: 535pt;
          height: 18.6pt;
          display: flex;
          align-items: center;
          font-size: 15pt;
          line-height: 1.1;
        }

        .overlay-cell {
          position: absolute;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cell-no { left: 0pt; width: 30pt; text-align: center; }
        .cell-year { left: 30pt; width: 38pt; text-align: center; }
        .cell-start { left: 68pt; width: 70pt; text-align: center; }
        .cell-end { left: 138pt; width: 70pt; text-align: center; }
        .cell-days { left: 208pt; width: 60pt; text-align: center; }
        .cell-title { left: 268pt; width: 115pt; text-align: left; padding-left: 4pt; }
        .cell-issuer { left: 383pt; width: 95pt; text-align: left; padding-left: 4pt; }
        .cell-code { left: 478pt; width: 57pt; text-align: center; }

        .page-number-mask {
          position: absolute;
          left: 512pt;
          top: 812pt;
          width: 53pt;
          height: 15pt;
          background: white;
          z-index: 2;
        }

        .overlay-page-number {
          left: 513pt;
          top: 813pt;
          font-size: 15pt;
          font-weight: bold;
          z-index: 3;
        }

        @media print {
          @page {
            size: A4 portrait !important;
            margin: 0 !important;
          }

          body, html {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .custom-form-print {
            padding: 0 !important;
            background: white !important;
          }

          .custom-form-page {
            margin: 0 !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>

      {pages.map((pageRecords, pageIdx) => {
        const pageNum = pageIdx + 1;
        return (
          <div key={`form-page-${pageNum}`} className="custom-form-page">
            <PdfBackgroundCanvas pdfDocument={pdfDocument} />
            
            <div className="subdivision-mask" />
            <div className="page-number-mask" />

            <div className="form-overlay">
              <div className="overlay-text overlay-name">{name}</div>
              <div className="overlay-text overlay-subdivision">{subdivisionText}</div>
              <div className="overlay-text overlay-page-number">หน้า {pageNum}/{totalPages}</div>

              {pageRecords.map((record, recordIdx) => {
                const globalIdx = pageIdx * pageSize + recordIdx + 1;
                const rowTop = 157.46 + recordIdx * 18.6;
                return (
                  <div 
                    key={`row-${globalIdx}`} 
                    className="table-row-overlay" 
                    style={{ top: `${rowTop.toFixed(2)}pt` }}
                  >
                    <div className="overlay-cell cell-no">{globalIdx}</div>
                    <div className="overlay-cell cell-year">{record.year || '-'}</div>
                    <div className="overlay-cell cell-start">{record.startDateFormatted || '-'}</div>
                    <div className="overlay-cell cell-end">{record.endDateFormatted || '-'}</div>
                    <div className="overlay-cell cell-days">{record.durationDays || '-'}</div>
                    <div className="overlay-cell cell-title" title={record.title}>{record.title}</div>
                    <div className="overlay-cell cell-issuer" title={record.issuer}>{record.issuer}</div>
                    <div className="overlay-cell cell-code" title={record.code}>{record.code}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PrintReportPage = () => {
  const { reportId } = useParams();
  const report = React.useMemo(() => getStoredPrintReport(reportId), [reportId]);
  const [isCustomFormView, setIsCustomFormView] = React.useState(false);

  React.useEffect(() => {
    if (!report) {
      document.title = 'Print Report';
      return undefined;
    }

    const nextTitle = getPrintReportDocumentTitle(report.fileName);
    document.title = nextTitle;

    return () => {
      document.title = nextTitle;
    };
  }, [report]);

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
        <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <ExternalLink size={24} />
          </div>
          <h1 className="mt-5 text-2xl font-black text-slate-900">ไม่พบเอกสารสำหรับพิมพ์</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            ลิงก์นี้อาจหมดอายุแล้ว หรือเอกสารถูกเปิดจากคนละเครื่อง/คนละ session
            ให้กลับไปที่หน้ารายงานเดิมแล้วกด <span className="font-bold text-slate-700">Print to PDF</span> ใหม่อีกครั้ง
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2ff]">
      <style>{`
        ${getPrintReportStyles()}

        .print-toolbar {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          justify-content: center;
          padding: 18px 24px 0;
        }

        .print-toolbar-card {
          display: flex;
          width: min(1120px, 100%);
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 18px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.88);
          box-shadow: 0 20px 45px -30px rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(18px);
        }

        .print-toolbar-copy {
          min-width: 0;
        }

        .print-toolbar-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }

        .print-toolbar-title {
          margin-top: 4px;
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .print-toolbar-subtitle {
          margin-top: 4px;
          font-size: 13px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .print-toolbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .print-toolbar-note {
          font-size: 13px;
          color: #64748b;
        }

        .print-toolbar-button {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: none;
          border-radius: 999px;
          background: #4338ca;
          color: #ffffff;
          padding: 11px 18px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          box-shadow: 0 18px 35px -22px rgba(67, 56, 202, 0.9);
        }

        .print-toolbar-button:hover {
          background: #3730a3;
          transform: translateY(-1px);
        }

        .dashboard-chart-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .dashboard-chart-card {
          border: 1px solid #dbe4f0;
          border-radius: 20px;
          background: #fff;
          padding: 16px;
          break-inside: avoid;
        }

        .dashboard-chart-title {
          margin-bottom: 10px;
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
        }

        .dashboard-chart-shell {
          height: 240px;
        }

        .dashboard-legend {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }

        .dashboard-legend-item {
          display: grid;
          grid-template-columns: 10px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          font-size: 12px;
        }

        .dashboard-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
        }

        .dashboard-legend-label {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #475569;
        }

        .dashboard-legend-value {
          font-weight: 800;
          color: #0f172a;
        }

        .goal-print-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .goal-print-card {
          border: 1px solid #dbe4f0;
          border-radius: 20px;
          background: #fff;
          padding: 16px;
          break-inside: avoid;
        }

        .goal-print-header {
          margin-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 10px;
        }

        .goal-print-title {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .goal-print-meta {
          font-size: 11px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .goal-print-meta .separator {
          color: #cbd5e1;
        }

        .goal-print-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .goal-print-stat-item .label {
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .goal-print-stat-item .value {
          font-size: 16px;
          font-weight: 800;
        }

        .goal-print-stat-item .value.success { color: #10b981; }
        .goal-print-stat-item .value.warning { color: #f59e0b; }
        .goal-print-stat-item .value.danger { color: #ef4444; }
        .goal-print-stat-item .value.muted { color: #64748b; }

        .dashboard-table-section {
          padding-bottom: 32px;
        }

        @media screen and (max-width: 860px) {
          .print-toolbar-card {
            flex-direction: column;
            align-items: flex-start;
          }

          .print-toolbar-actions {
            width: 100%;
            flex-wrap: wrap;
          }

          .dashboard-chart-grid {
            grid-template-columns: 1fr;
          }
        }

        @media print {
          .print-toolbar {
            display: none;
          }

          .dashboard-print {
            width: 100%;
          }

          .section,
          .dashboard-chart-grid {
            break-inside: auto;
            page-break-inside: auto;
          }

          .dashboard-chart-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 12px;
            align-items: start;
          }

          .dashboard-chart-card,
          .table-shell {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .dashboard-chart-shell {
            height: 210px;
          }

          .dashboard-legend {
            margin-top: 10px;
          }

          .dashboard-table-section {
            padding-bottom: 0;
          }
        }
      `}</style>

      <div className="print-toolbar">
        <div className="print-toolbar-card">
          <div className="print-toolbar-copy">
            <div className="print-toolbar-label">Print Preview</div>
            <div className="print-toolbar-title">{report.reportTitle}</div>
            {report.subtitle ? <div className="print-toolbar-subtitle">{report.subtitle}</div> : null}
          </div>

          <div className="print-toolbar-actions">
            {report.profile?.customFormRows && (
              <button
                type="button"
                className="print-toolbar-button"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', marginRight: '8px' }}
                onClick={() => setIsCustomFormView(!isCustomFormView)}
              >
                <Printer size={16} />
                <span>{isCustomFormView ? 'แสดงรายงานปกติ' : 'พิมพ์ตามแบบฟอร์ม'}</span>
              </button>
            )}
            <div className="print-toolbar-note">เปิดหน้านี้แล้วสั่งพิมพ์หรือ Save as PDF ได้ทันที</div>
            <button type="button" className="print-toolbar-button" onClick={() => window.print()}>
              <Printer size={16} />
              <span>พิมพ์ / Save as PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="print-shell">
        {(report.type === 'custom-form' || isCustomFormView) ? (
          <CustomFormPrintContent report={report} />
        ) : report.type === 'dashboard' ? (
          <DashboardPrintContent report={report} />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: renderPrintReportMarkup(report) }} />
        )}
      </div>
    </div>
  );
};

export default PrintReportPage;
