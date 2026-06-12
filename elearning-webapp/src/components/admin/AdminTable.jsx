import React from 'react';
import Skeleton from '../common/Skeleton';

const AdminTable = ({
  columns,
  data,
  loading,
  emptyMessage = 'ไม่พบข้อมูล',
  renderRow,
  className = '',
}) => {
  return (
    <div className={`card w-full min-w-0 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm sm:text-base">
          <thead>
            <tr className="border-b border-border bg-gray-50 text-xs sm:text-sm text-muted">
              {columns.map((column, index) => (
                <th key={index} className={`p-3 sm:p-4 font-medium ${column.className || ''}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={columns.length} className="p-4">
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))
            ) : (!Array.isArray(data) || data.length === 0) ? (
              <tr>
                <td colSpan={columns.length} className="p-12 text-center text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => renderRow(item, index))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTable;
