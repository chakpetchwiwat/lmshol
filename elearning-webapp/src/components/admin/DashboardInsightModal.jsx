import React from 'react';
import { FileDown, X } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';

const formatCellValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const DashboardInsightModal = ({ insight, onClose, onPrint }) => {
  if (!insight) return null;

  const {
    title,
    subtitle,
    summary = [],
    columns = [],
    rows = [],
    emptyMessage = 'ไม่พบข้อมูล',
  } = insight;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
        <button
          type="button"
          className="absolute inset-0 bg-slate-950/65"
          onClick={onClose}
          aria-label="ปิดรายละเอียด dashboard"
        />

        <div className="relative flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_100px_-32px_rgba(15,23,42,0.55)]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div className="min-w-0 text-left">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Dashboard Insight</div>
              <h3 className="mt-2 text-2xl font-black text-slate-900">{title}</h3>
              {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {onPrint ? (
                <button
                  type="button"
                  onClick={() => onPrint(insight)}
                  className="btn btn-secondary btn-sm"
                >
                  <FileDown size={15} />
                  <span>Print</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {summary.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4 md:grid-cols-3">
              {summary.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
                  <div className="mt-2 text-lg font-black text-slate-900">{formatCellValue(item.value)}</div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex-1 overflow-auto px-6 py-5">
            <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-50">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? rows.map((row, index) => (
                    <tr key={row.id || row.userId || index} className="border-t border-slate-100">
                      {columns.map((column) => (
                        <td key={column.key} className="px-4 py-3 text-sm text-slate-700">
                          {formatCellValue(typeof column.render === 'function' ? column.render(row) : row[column.key])}
                        </td>
                      ))}
                    </tr>
                  )) : (
                    <tr>
                      <td
                        colSpan={Math.max(columns.length, 1)}
                        className="px-4 py-16 text-center text-sm font-medium text-slate-400"
                      >
                        {emptyMessage}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default DashboardInsightModal;
