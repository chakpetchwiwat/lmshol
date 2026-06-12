import React from 'react';
import { ExternalLink, Printer, FileDown } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { adminAPI } from '../../utils/api';
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
                <th>กอง</th>
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

const CustomFormPrintContent = ({ report }) => {
  const name = report.profile?.name || '';
  const subdivision = report.profile?.subdivision || '';
  const department = report.profile?.department || '';

  let cleanSub = subdivision.trim();
  if (cleanSub && !cleanSub.startsWith('กลุ่ม')) {
    cleanSub = `กลุ่ม${cleanSub}`;
  }
  const subdivisionText = [cleanSub, department.trim(), 'สำนักงานคณะกรรมการอาหารและยา']
    .filter(Boolean)
    .join(' ');

  const records = report.profile?.customFormRows || report.rows || [];
  const pageSize = 16;
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const pages = Array.from({ length: totalPages }, (_, pageIndex) => (
    records.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  ));
  const emptyRows = (count) => Array.from({ length: count }, (_, index) => index);

  const getPageDateRange = (pageRecords) => {
    const dates = [];
    pageRecords.forEach(r => {
      if (r.rawStartDate) {
        const d = new Date(r.rawStartDate);
        if (!isNaN(d.getTime())) dates.push(d);
      }
      if (r.rawEndDate) {
        const d = new Date(r.rawEndDate);
        if (!isNaN(d.getTime())) dates.push(d);
      }
      if (!r.rawStartDate && !r.rawEndDate && r.dateForSort) {
        const d = new Date(r.dateForSort);
        if (!isNaN(d.getTime())) dates.push(d);
      }
    });

    if (dates.length === 0) return '..............................';

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    const minStr = formatThaiDateTime(minDate, false);
    const maxStr = formatThaiDateTime(maxDate, false);

    if (minStr === '-' || maxStr === '-') {
      return '..............................';
    }

    return `${minStr} - ${maxStr}`;
  };

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

        .custom-form-print {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #eef2ff;
          padding: 24px 0;
          min-height: 100vh;
        }

        .custom-form-page {
          position: relative;
          width: 841.92pt;
          height: 595.32pt;
          margin-bottom: 22px;
          padding: 28pt 30pt 24pt;
          overflow: hidden;
          box-sizing: border-box;
          background: #fff;
          color: #111827;
          box-shadow: 0 18px 50px -28px rgba(15, 23, 42, 0.45);
          font-family: 'TH Sarabun PSK', 'Sarabun', 'Tahoma', sans-serif;
          font-size: 16pt;
          line-height: 1.1;
        }

        .form-title {
          margin: 0 0 1pt;
          font-size: 16pt;
          font-weight: 700;
          line-height: 1.05;
          text-align: center;
        }

        .form-person-line,
        .form-unit-line {
          display: grid;
          align-items: end;
          column-gap: 5pt;
          height: 17pt;
        }

        .form-person-line {
          grid-template-columns: auto 1fr;
        }

        .form-unit-line {
          grid-template-columns: 1fr;
        }

        .form-fill {
          min-width: 0;
          border-bottom: 0.7pt dotted #666;
          padding: 0 4pt 1pt;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .training-record-table {
          width: 100%;
          margin-top: 10pt;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 16pt;
          line-height: 1.15;
        }

        .training-record-table th,
        .training-record-table td {
          border: 0.7pt solid #555;
          height: 20pt;
          padding: 1pt 3pt;
          vertical-align: middle;
        }

        .training-record-table th {
          text-align: center;
          font-weight: 700;
          line-height: 0.95;
        }

        .training-record-table td {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .training-record-table .center {
          text-align: center;
        }

        .training-record-table .wrap {
          display: -webkit-box;
          overflow: hidden;
          white-space: normal;
          line-height: 1.02;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .form-footer-container {
          position: absolute;
          left: 30pt;
          right: 30pt;
          bottom: 18pt;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 16pt;
          font-weight: 700;
          font-family: 'TH Sarabun PSK', sans-serif;
        }

        .form-note {
          margin-top: 8pt;
          font-size: 16pt;
          font-weight: 700;
          font-family: 'TH Sarabun PSK', sans-serif;
        }

        .training-record-table col:nth-child(1) { width: 45pt; }
        .training-record-table col:nth-child(2) { width: 60pt; }
        .training-record-table col:nth-child(3) { width: 100pt; }
        .training-record-table col:nth-child(4) { width: 100pt; }
        .training-record-table col:nth-child(5) { width: 60pt; }
        .training-record-table col:nth-child(6) { width: 200pt; }
        .training-record-table col:nth-child(7) { width: 180pt; }
        .training-record-table col:nth-child(8) { width: auto; }

        @media print {
          @page {
            size: A4 landscape !important;
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
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .custom-form-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {pages.map((pageRecords, pageIdx) => {
        const pageNum = pageIdx + 1;
        const missingRowCount = Math.max(0, pageSize - pageRecords.length);

        return (
          <div key={`form-page-${pageNum}`} className="custom-form-page">
            <h1 className="form-title">แบบประวัติการฝึกอบรม (Training Record)</h1>
            <div className="form-person-line">
              <span>ของ</span>
              <span className="form-fill">{name || '-'}</span>
            </div>
            <div className="form-unit-line">
              <span className="form-fill">{subdivisionText || '-'}</span>
            </div>

            <table className="training-record-table" aria-label="Training Record">
              <colgroup>
                <col />
                <col />
                <col />
                <col />
                <col />
                <col />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th>ลำดับที่</th>
                  <th>ปี พ.ศ.</th>
                  <th>ระยะเวลาเริ่มการอบรม</th>
                  <th>ระยะเวลาสิ้นสุดการอบรม</th>
                  <th>จำนวนวัน</th>
                  <th>ชื่อหัวข้อ/หลักสูตร</th>
                  <th>หน่วยงานที่จัดการฝึกอบรม / สถานที่</th>
                  <th>รหัสหลักสูตร</th>
                </tr>
              </thead>
              <tbody>
                {pageRecords.map((record, recordIdx) => {
                  const globalIdx = pageIdx * pageSize + recordIdx + 1;
                  return (
                    <tr key={`row-${globalIdx}`}>
                      <td className="center">{globalIdx}</td>
                      <td className="center">{record.year || '-'}</td>
                      <td className="center">{record.startDateFormatted || '-'}</td>
                      <td className="center">{record.endDateFormatted || '-'}</td>
                      <td className="center">{record.durationDays || '-'}</td>
                      <td><span className="wrap" title={record.title}>{record.title || '-'}</span></td>
                      <td><span className="wrap" title={record.issuer}>{record.issuer || '-'}</span></td>
                      <td className="center">{record.code || '-'}</td>
                    </tr>
                  );
                })}
                {emptyRows(missingRowCount).map((emptyIndex) => (
                  <tr key={`empty-row-${pageNum}-${emptyIndex}`} aria-hidden="true">
                     <td>&nbsp;</td>
                     <td>&nbsp;</td>
                     <td>&nbsp;</td>
                     <td>&nbsp;</td>
                     <td>&nbsp;</td>
                     <td>&nbsp;</td>
                     <td>&nbsp;</td>
                     <td>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pageNum === totalPages && (
              <div className="form-note">
                หมายเหตุ: วันฝึกอบรม 1 วัน คิดเป็นชั่วโมงฝึกอบรม 8 ชั่วโมง
              </div>
            )}

            <div className="form-footer-container">
              <div>Printed date: {formatThaiDateTime(new Date(), false)}</div>
              <div>F-D3-14 ({getPageDateRange(pageRecords)}) หน้า {pageNum} / {totalPages}</div>
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
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExportExcel = async () => {
    const userId = report?.profile?.id;
    if (!userId) {
      alert('ไม่พบรหัสผู้ใช้เพื่อดาวน์โหลดแบบฟอร์ม กรุณาปิดหน้านี้ รีเฟรชหน้ารายชื่อผู้ใช้งานหลัก (F5) แล้วกดพิมพ์ใหม่อีกครั้งเพื่อปรับปรุงข้อมูลในเบราว์เซอร์');
      return;
    }

    try {
      setIsExporting(true);
      const response = await adminAPI.exportSingleUserForm(userId);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const rawName = report?.profile?.name || 'user';
      link.setAttribute('download', `ประวัติผู้เรียน_${rawName}_แบบฟอร์ม.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export single user form:', error);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลดแบบฟอร์ม');
    } finally {
      setIsExporting(false);
    }
  };

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
            {(report.type === 'custom-form' || isCustomFormView) && (
              <button
                type="button"
                className="print-toolbar-button"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', marginRight: '8px' }}
                onClick={handleExportExcel}
                disabled={isExporting}
              >
                <FileDown size={16} />
                <span>{isExporting ? 'กำลังดาวน์โหลด...' : 'Export to Excel'}</span>
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
