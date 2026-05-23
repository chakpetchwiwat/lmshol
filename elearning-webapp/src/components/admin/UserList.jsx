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
  cohortRoles = [],
}) => {
  const cohortRoleLabelMap = React.useMemo(
    () => Object.fromEntries(cohortRoles.map((role) => [role.key, role.name || role.key])),
    [cohortRoles]
  );

  return (
    <AdminTable
      columns={columns}
      data={users}
      loading={loading}
      emptyMessage="ยังไม่พบผู้ใช้งานที่ตรงกับตัวกรอง"
      renderRow={(user) => (
        <tr key={user.id} className="border-b border-border transition-colors hover:bg-gray-50/50">
          <td className="p-3 sm:p-4">
            <div className="font-medium text-xs sm:text-sm">{user.name}</div>
            <div className="mt-0.5 text-[10px] sm:text-xs text-muted">{user.email}</div>
          </td>
          <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted min-w-[120px]">
            {Array.isArray(user.roles) && user.roles.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {user.roles.map((r) => {
                  const label = cohortRoleLabelMap[r] || r;
                  return (
                    <span
                      key={r}
                      className="inline-block px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded bg-slate-100 text-slate-700 whitespace-nowrap"
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            ) : (
              '-'
            )}
          </td>
          <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted max-w-[120px] truncate" title={user.department}>{user.department || '-'}</td>
          <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted max-w-[120px] truncate" title={user.subdivision}>{user.subdivision || '-'}</td>
          <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted max-w-[120px] truncate" title={user.position}>{user.position || '-'}</td>
          <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted whitespace-nowrap">{user.positionLevel || '-'}</td>
          <td className="p-3 sm:p-4 text-center text-xs sm:text-sm whitespace-nowrap">
            <span className="rounded-full bg-primary-light px-2 py-1 font-bold text-primary">
              {user._count?.enrollments || 0}
            </span>
          </td>
          <td className="p-3 sm:p-4 text-right whitespace-nowrap">
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
