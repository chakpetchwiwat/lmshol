import React from 'react';
import { CheckCircle2, FilePenLine, Send } from 'lucide-react';
import { ENTITY_STATUS } from '../../../utils/constants/statuses';

const CourseBuilderFooter = ({
  courseStatus,
  isPersisted,
  lessonCount,
  onClose,
  readOnly
}) => {
  const isPublished = courseStatus === ENTITY_STATUS.PUBLISHED;
  const canPublish = isPersisted && lessonCount > 0;
  let helperText = 'บันทึกข้อมูลพื้นฐานเพื่อเริ่มเพิ่มบทเรียน';

  if (isPersisted && canPublish) {
    helperText = 'แก้ไขต่อได้ หรือเผยแพร่เมื่อพร้อม';
  } else if (isPersisted) {
    helperText = 'เพิ่มบทเรียนอย่างน้อย 1 บทก่อนเผยแพร่';
  }

  return (
    <div className="mt-8 flex flex-col gap-4 border-t border-slate-100 pt-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        {isPublished ? (
          <CheckCircle2 size={18} className="text-emerald-600" />
        ) : (
          <FilePenLine size={18} className="text-amber-600" />
        )}
        <div>
          <p className="text-sm font-black text-slate-900">
            {isPublished ? 'Published' : 'Draft'}
          </p>
          <p className="text-xs font-medium text-slate-500">
            {helperText}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onClose} className="btn border-2 border-slate-300 bg-white px-6 text-xs font-black uppercase tracking-[0.15em] text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50">
          ยกเลิก
        </button>
        {!readOnly && (
          <>
            <button type="submit" name="courseAction" value="draft" className="btn border-2 border-indigo-700 bg-indigo-700 px-6 text-xs font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-indigo-700/20 hover:border-indigo-800 hover:bg-indigo-800">
              <FilePenLine size={16} />
              {isPersisted ? 'บันทึกแบบร่าง' : 'สร้างฉบับร่าง'}
            </button>
            {isPersisted && (
              <button
                type="submit"
                name="courseAction"
                value="publish"
                disabled={!canPublish}
                className="btn border-2 border-emerald-600 bg-emerald-600 px-6 text-xs font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-emerald-600/20 hover:border-emerald-700 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
              >
                <Send size={16} />
                เผยแพร่คอร์ส
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CourseBuilderFooter;
