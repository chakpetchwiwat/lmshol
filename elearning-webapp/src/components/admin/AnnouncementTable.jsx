import React from 'react';
import { History, Edit3, Archive, Trash2, RotateCcw } from 'lucide-react';
import { ENTITY_VIEW_STATUS } from '../../utils/constants/statuses';
import { formatThaiDateTime } from '../../utils/dateUtils';
import AdminTable from './AdminTable';
import AdminActionMenu from './AdminActionMenu';

const getTypeLabel = (type) => {
  if (type === 'video') return 'วิดีโอ';
  if (type === 'quiz') return 'แบบทดสอบ';
  if (type === 'pdf' || type === 'document') return 'เอกสาร';
  return 'บทความ';
};

const AnnouncementTable = ({
  data,
  columns,
  loading,
  viewMode,
  onViewHistory,
  onEdit,
  onArchive,
  onRepublish,
  onDelete
}) => {
  const [openDropdownId, setOpenDropdownId] = React.useState(null);

  return (
    <AdminTable
      columns={columns}
      data={data}
      loading={loading}
      emptyMessage="ยังไม่มีประกาศในรายการนี้"
      renderRow={(announcement) => (
        <tr key={announcement.id} className="border-b border-slate-100 align-top">
          <td className="p-4">
            <div className="max-w-xl">
              <p className="font-bold text-slate-900">{announcement.title}</p>
              <p className="mt-1 text-sm text-slate-500">{announcement.description || 'ไม่มีคำอธิบายเพิ่มเติม'}</p>
            </div>
          </td>
          <td className="p-4 text-sm font-medium text-slate-600">
            {announcement.scope === 'GLOBAL' ? 'ทั้งองค์กร' : (announcement.department?.name || '-')}
          </td>
          <td className="p-4">
            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
              {getTypeLabel(announcement.type)}
            </span>
          </td>
          <td className="p-4 text-sm font-medium text-slate-600">
            {announcement.expiredAt ? formatThaiDateTime(announcement.expiredAt, true) : '-'}
          </td>
          <td className="p-4">
            <div className="flex justify-center">
              <AdminActionMenu
                isOpen={openDropdownId === announcement.id}
                onToggle={() => setOpenDropdownId(openDropdownId === announcement.id ? null : announcement.id)}
                actions={[
                  {
                    icon: History,
                    label: 'ประวัติการเข้าอ่าน',
                    onClick: () => onViewHistory(announcement),
                    className: 'text-slate-600 hover:bg-blue-50 hover:text-blue-600',
                    iconClassName: 'bg-blue-50 text-blue-500 group-hover:bg-blue-100',
                  },
                  {
                    icon: Edit3,
                    label: 'แก้ไขประกาศ',
                    onClick: () => onEdit(announcement),
                    className: 'text-slate-600 hover:bg-slate-50 hover:text-primary',
                    iconClassName: 'bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary',
                  },
                  {
                    hidden: viewMode !== ENTITY_VIEW_STATUS.ACTIVE,
                    icon: Archive,
                    label: 'เก็บเข้าคลัง',
                    onClick: () => onArchive(announcement),
                    className: 'text-slate-600 hover:bg-amber-50 hover:text-amber-600',
                    iconClassName: 'bg-amber-50 text-amber-500 group-hover:bg-amber-100',
                  },
                  {
                    hidden: viewMode !== ENTITY_VIEW_STATUS.ARCHIVED,
                    icon: RotateCcw,
                    label: 'นำกลับมาใช้งาน',
                    onClick: () => onRepublish(announcement),
                    className: 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-600',
                    iconClassName: 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100',
                  },
                  {
                    icon: Trash2,
                    label: 'ลบประกาศ',
                    onClick: () => onDelete(announcement),
                    className: 'text-slate-500 hover:bg-red-50 hover:text-red-600 mt-1 border-t border-slate-100/60 pt-2',
                    iconClassName: 'bg-red-50 text-red-500 group-hover:bg-red-100',
                  }
                ]}
              />
            </div>
          </td>
        </tr>
      )}
    />
  );
};

export default AnnouncementTable;
