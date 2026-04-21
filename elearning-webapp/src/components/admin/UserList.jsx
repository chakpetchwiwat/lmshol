import React from 'react';
import { CheckCircle2, Clock3, Eye, TriangleAlert, Edit } from 'lucide-react';
import { getRoleLabel } from '../../utils/roles';
import { formatThaiDateTime } from '../../utils/dateUtils';
import { ENROLLMENT_STATUS } from '../../utils/constants/statuses';
import AdminTable from './AdminTable';

const STATUS_CONFIG = {
  [ENROLLMENT_STATUS.COMPLETED]: {
    label: 'เรียนจบแล้ว',
    badgeClassName: 'bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
    iconClassName: 'text-emerald-600',
  },
  [ENROLLMENT_STATUS.IN_PROGRESS]: {
    label: 'กำลังเรียน',
    badgeClassName: 'bg-amber-50 text-amber-700',
    icon: Clock3,
    iconClassName: 'text-amber-600',
  },
  [ENROLLMENT_STATUS.NOT_STARTED]: {
    label: 'ยังไม่เรียน',
    badgeClassName: 'bg-rose-50 text-rose-700',
    icon: TriangleAlert,
    iconClassName: 'text-rose-600',
  },
};

const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG[ENROLLMENT_STATUS.NOT_STARTED];

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
      emptyMessage="ยังไม่พบพนักงานที่ตรงกับตัวกรอง"
      renderRow={(user) => {
        const tracking = user.tracking || {};
        const statusConfig = getStatusConfig(tracking.status);
        const StatusIcon = statusConfig.icon;
        const positionLabel = user.tier?.name || user.tier || getRoleLabel(user);

        return (
          <tr key={user.id} className="border-b border-border transition-colors hover:bg-gray-50/50">
            <td className="p-4 align-top">
              <button
                type="button"
                onClick={() => onViewUser(user.id)}
                className="text-left transition-colors hover:text-primary"
              >
                <div className="font-semibold text-sm">{user.name}</div>
                <div className="mt-0.5 text-xs text-muted">{user.email}</div>
              </button>
            </td>

            <td className="p-4 align-top">
              <div className="text-sm font-semibold text-slate-800">{positionLabel || '-'}</div>
              <div className="mt-0.5 text-xs text-muted">{user.department || 'ไม่ระบุทีม'}</div>
            </td>

            <td className="p-4 align-top">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusConfig.badgeClassName}`}>
                {statusConfig.label}
              </span>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                <StatusIcon size={13} className={statusConfig.iconClassName} />
                <span>{tracking.progressPercent || 0}%</span>
              </div>
            </td>

            <td className="p-4 align-top">
              <div className="text-sm font-semibold text-slate-800">{tracking.latestCourseTitle || '-'}</div>
              <div className="mt-0.5 text-xs text-muted">
                เรียนจบแล้ว {tracking.completedCourses || user._count?.enrollments || 0} คอร์ส
              </div>
            </td>

            <td className="p-4 align-top text-sm text-slate-600">
              {tracking.latestLearningAt ? formatThaiDateTime(tracking.latestLearningAt, true) : '-'}
            </td>

            <td className="p-4 text-right align-top">
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
        );
      }}
    />
  );
};

export default UserList;
