import React, { useState } from 'react';
import { Calendar, FileText, Trash2, Archive, RotateCcw } from 'lucide-react';
import { formatThaiDateTime } from '../../utils/dateUtils';
import AdminTable from './AdminTable';
import AdminActionMenu from './AdminActionMenu';
import { ENTITY_VIEW_STATUS } from '../../utils/constants/statuses';


const GoalList = ({ goals, columns, viewMode, onViewReport, onDeleteGoal, onArchiveGoal, onRepublishGoal }) => {

  const [openDropdownId, setOpenDropdownId] = useState(null);
  return (
    <div className="card">
      <AdminTable 
        columns={columns}
        data={goals}
        emptyMessage="ยังไม่มีการกำหนดเป้าหมายในขณะนี้"
        renderRow={(goal) => (
          <tr key={goal.id} className="border-b border-border hover:bg-gray-50/50 transition-colors">
            <td className="p-4">
              <div className="font-bold text-slate-800">{goal.title}</div>
              <div className="text-xs text-muted">สร้างเมื่อ {formatThaiDateTime(goal.createdAt)}</div>
            </td>
            <td className="p-4">
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${goal.type === 'ANY' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                {goal.type === 'ANY' ? 'คอร์สใดก็ได้' : 'เฉพาะคอร์ส'}
              </span>
            </td>
            <td className="p-4 text-sm text-slate-600">
              {goal.type === 'ANY' ? (
                <span>สำเร็จ {goal.targetCount} คอร์ส</span>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{goal.courses.length} คอร์สที่กำหนด</span>
                  <div className="flex flex-wrap gap-1">
                    {goal.courses.slice(0, 2).map(gc => (
                      <span key={gc.courseId} className="text-[10px] bg-slate-100 px-1 rounded">{gc.course.title}</span>
                    ))}
                    {goal.courses.length > 2 && <span className="text-[10px] text-muted">...และอีก {goal.courses.length - 2} คอร์ส</span>}
                  </div>
                </div>
              )}
            </td>
            <td className="p-4 text-sm font-medium">
              {goal.expiryDate ? (
                <div className="flex items-center gap-1 text-slate-700">
                  <Calendar size={14} className="text-muted" />
                  {formatThaiDateTime(goal.expiryDate)}
                </div>
              ) : <span className="text-muted">ไม่มีกำหนด</span>}
            </td>
            <td className="p-4">
              <span className={`text-xs font-medium ${goal.scope === 'GLOBAL' ? 'text-blue-600' : 'text-amber-600'}`}>
                {goal.scope === 'GLOBAL' ? 'ทั้งองค์กร' : `แผนก ${goal.department?.name || 'ของคุณ'}`}
              </span>
            </td>
            <td className="p-4 text-center">
              <div className="flex justify-center">
                <AdminActionMenu
                  isOpen={openDropdownId === goal.id}
                  onToggle={() => setOpenDropdownId(openDropdownId === goal.id ? null : goal.id)}
                  actions={[
                    {
                      icon: FileText,
                      label: 'ดูรายงาน',
                      onClick: () => onViewReport(goal),
                      className: 'text-slate-600 hover:bg-blue-50 hover:text-blue-600',
                      iconClassName: 'bg-blue-50 text-blue-500 group-hover:bg-blue-100',
                    },
                    {
                      hidden: viewMode === ENTITY_VIEW_STATUS.ARCHIVED,
                      icon: Archive,
                      label: 'เก็บเข้าคลัง',
                      onClick: () => onArchiveGoal(goal.id),
                      className: 'text-slate-600 hover:bg-amber-50 hover:text-amber-600',
                      iconClassName: 'bg-amber-50 text-amber-500 group-hover:bg-amber-100',
                    },
                    {
                      hidden: viewMode !== ENTITY_VIEW_STATUS.ARCHIVED,
                      icon: RotateCcw,
                      label: 'นำกลับมาใช้งาน',
                      onClick: () => onRepublishGoal(goal.id),
                      className: 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-600',
                      iconClassName: 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100',
                    },

                    {
                      icon: Trash2,
                      label: 'ลบเป้าหมาย',
                      onClick: () => onDeleteGoal(goal.id),
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
    </div>
  );
};

export default GoalList;
