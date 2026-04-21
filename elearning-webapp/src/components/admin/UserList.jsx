import React from 'react';
import { Eye, Edit } from 'lucide-react';
import { getRoleLabel } from '../../utils/roles';
import { formatThaiDateTime } from '../../utils/dateUtils';
import AdminTable from './AdminTable';

const UserList = ({
  columns,
  users,
  loading,
  onViewUser,
  onEditUser,
  onDeleteUser,
  canEditUsers,
}) => {
  return (
    <AdminTable
      columns={columns}
      data={users}
      loading={loading}
      emptyMessage="ยังไม่พบผู้ใช้งานที่ตรงกับตัวกรอง"
      renderRow={(user) => (
        <tr key={user.id} className="border-b border-border transition-colors hover:bg-gray-50/50">
          <td className="p-4">
            <div className="font-medium text-sm">{user.name}</div>
            <div className="mt-0.5 text-xs text-muted">{user.email}</div>
          </td>
          <td className="p-4 text-sm text-muted">{getRoleLabel(user)}</td>
          <td className="p-4 text-sm text-muted">{user.department || '-'}</td>
          <td className="p-4 text-sm text-muted">{user.tier?.name || user.tier || '-'}</td>
          <td className="p-4 text-sm text-muted">
            {user.employmentDate ? formatThaiDateTime(user.employmentDate) : '-'}
          </td>
          <td className="p-4 text-center text-sm">
            <span className="rounded-full bg-primary-light px-2 py-1 font-bold text-primary">
              {user._count?.enrollments || 0}
            </span>
          </td>
          <td className="p-4 text-right text-sm font-bold text-warning">{user.pointsBalance || 0}</td>
          <td className="p-4 text-right">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => onViewUser(user.id)}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                <Eye size={14} />
                ดูประวัติ
              </button>
              {canEditUsers && (
                <>
                  <button
                    type="button"
                    onClick={() => onEditUser(user)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:underline"
                  >
                    <Edit size={14} />
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteUser(user.id, user.name)}
                    className="text-sm font-medium text-danger hover:underline"
                  >
                    ลบ
                  </button>
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    />
  );
};

export default UserList;
