import React, { useEffect, useMemo } from 'react';
import { ExternalLink, Printer } from 'lucide-react';
import { useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
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
    roiTrend = [],
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
            <div className="dashboard-chart-title">Incentive ROI Trend</div>
            <div className="dashboard-chart-shell">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={roiTrend} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="completions" fill="#4f46e5" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                  <Line yAxisId="right" type="monotone" dataKey="points" stroke="#059669" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
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

const PrintReportPage = () => {
  const { reportId } = useParams();
  const report = useMemo(() => getStoredPrintReport(reportId), [reportId]);

  useEffect(() => {
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
            <div className="print-toolbar-note">เปิดหน้านี้แล้วสั่งพิมพ์หรือ Save as PDF ได้ทันที</div>
            <button type="button" className="print-toolbar-button" onClick={() => window.print()}>
              <Printer size={16} />
              <span>พิมพ์ / Save as PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="print-shell">
        {report.type === 'dashboard' ? (
          <DashboardPrintContent report={report} />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: renderPrintReportMarkup(report) }} />
        )}
      </div>
    </div>
  );
};

export default PrintReportPage;
