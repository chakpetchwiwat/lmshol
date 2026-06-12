import React from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';
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
      className="border-none shadow-none rounded-none bg-transparent"
      renderRow={(user) => (
        <tr key={user.id} className="border-b border-border transition-colors hover:bg-gray-50/50">
          <td className="p-3 sm:p-4">
            <div className="font-medium text-xs sm:text-sm break-words">{user.name}</div>
            <div className="mt-0.5 text-[10px] sm:text-xs text-muted break-all">{user.email}</div>
          </td>
          <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted min-w-[120px]">
            {Array.isArray(user.roles) && user.roles.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {user.roles.map((r) => {
                  const label = cohortRoleLabelMap[r] || r;
                  return (
                    <span
                      key={r}
                      className="inline-block px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded bg-slate-100 text-slate-700 whitespace-normal break-words"
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
          <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted break-words whitespace-normal">{user.department || '-'}</td>
          <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted break-words whitespace-normal">{user.subdivision || '-'}</td>
          <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted break-words whitespace-normal">{user.position || '-'}</td>
          <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted break-words whitespace-normal">{user.positionLevel || '-'}</td>
          <td className="p-3 sm:p-4 text-center text-xs sm:text-sm whitespace-nowrap">
            <span className="rounded-full bg-primary-light px-2 py-1 font-bold text-primary">
              {user._count?.enrollments || 0}
            </span>
          </td>
          <td className="p-3 sm:p-4 text-right">
            <div className="flex justify-end items-center gap-1.5">
              <button
                type="button"
                onClick={() => onViewUser(user.id)}
                className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg transition-all"
                title="ดูประวัติ"
              >
                <Eye size={16} />
              </button>
              {canEditUsers && (
                <>
                  <button
                    type="button"
                    onClick={() => onEditUser(user)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
                    title="แก้ไข"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteUser(user.id, user.name)}
                    className="p-1.5 text-slate-400 hover:text-danger hover:bg-red-50 rounded-lg transition-all"
                    title="ลบ"
                  >
                    <Trash2 size={16} />
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
