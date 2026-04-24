import React from 'react';
import Skeleton from '../common/Skeleton';

const AdminTable = ({
  columns,
  data,
  loading,
  emptyMessage = 'ไม่พบข้อมูล',
  renderRow,
}) => {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-gray-50 text-sm text-muted">
              {columns.map((column, index) => (
                <th key={index} className={`p-4 font-medium ${column.className || ''}`}>
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
