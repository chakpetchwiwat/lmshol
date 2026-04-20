import React, { useEffect, useMemo } from 'react';
import { ExternalLink, Printer } from 'lucide-react';
import { useParams } from 'react-router-dom';
import {
  getPrintReportDocumentTitle,
  getPrintReportStyles,
  getStoredPrintReport,
  renderPrintReportMarkup,
} from '../../utils/printUtils';

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

        @media (max-width: 860px) {
          .print-toolbar-card {
            flex-direction: column;
            align-items: flex-start;
          }

          .print-toolbar-actions {
            width: 100%;
            flex-wrap: wrap;
          }
        }

        @media print {
          .print-toolbar {
            display: none;
          }
        }
      `}</style>

      <div className="print-toolbar">
        <div className="print-toolbar-card">
          <div className="print-toolbar-copy">
            <div className="print-toolbar-label">Print Preview</div>
            <div className="print-toolbar-title">{report.reportTitle}</div>
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

      <div
        className="print-shell"
        dangerouslySetInnerHTML={{ __html: renderPrintReportMarkup(report) }}
      />
    </div>
  );
};

export default PrintReportPage;
