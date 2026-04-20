import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const PopularCoursesTable = ({ courses, onSelectCourse }) => {
  const safeCourses = courses || [];

  return (
    <div className="card card-no-lift overflow-hidden p-6 lg:col-span-2">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="text-left">
          <h3 className="text-lg font-bold text-slate-900">คอร์สที่มีผู้เรียนสูง</h3>
          <p className="text-sm text-slate-500">กดที่แถวเพื่อดูรายชื่อผู้ที่ลงเรียนคอร์สนั้น</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
          Top {safeCourses.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border text-xs font-black uppercase tracking-widest text-muted">
              <th className="pb-4 font-black">คอร์ส</th>
              <th className="pb-4 font-black text-right">จำนวนผู้เรียน</th>
              <th className="pb-4 font-black text-right">ดูรายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {safeCourses.map((course, index) => (
              <tr
                key={course.id}
                className="group cursor-pointer border-b border-slate-100 last:border-0"
                onClick={() => onSelectCourse?.(course)}
              >
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 transition-colors group-hover:text-primary">
                        {course.title}
                      </div>
                      <div className="text-xs text-slate-400">คลิกเพื่อดูรายชื่อผู้เรียน</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 text-right">
                  <span className="text-sm font-black text-success">{course.students} คน</span>
                </td>
                <td className="py-4 text-right">
                  <ArrowUpRight size={16} className="ml-auto text-slate-300 transition-colors group-hover:text-primary" />
                </td>
              </tr>
            ))}
            {safeCourses.length === 0 && (
              <tr>
                <td colSpan={3} className="py-12 text-center text-sm font-medium text-slate-400">
                  ยังไม่มีข้อมูลคอร์สในช่วงเวลานี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PopularCoursesTable;
