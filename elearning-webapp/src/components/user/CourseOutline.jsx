import React from 'react';
import {
  Bookmark,
  BookOpen,
  Check,
  ClipboardCheck,
  Clock,
  FileText,
  MonitorPlay,
  PlayCircle,
} from 'lucide-react';

const getLessonTypeLabel = (type) => {
  if (type === 'quiz') return 'แบบทดสอบ';
  if (type === 'assessment') return 'Assessment';
  if (type === 'article') return 'บทความ';
  if (type === 'pdf' || type === 'document') return 'เอกสาร';
  return 'วิดีโอ';
};

const getLessonIcon = (lesson, isEnrolled) => {
  const iconClass = isEnrolled ? 'group-hover:text-primary/70' : '';

  if (lesson.type === 'quiz') return <Check size={14} className={iconClass} />;
  if (lesson.type === 'assessment') return <ClipboardCheck size={14} className={iconClass} />;
  if (lesson.type === 'article') return <BookOpen size={14} className={iconClass} />;
  if (lesson.type === 'pdf' || lesson.type === 'document') return <FileText size={14} className={iconClass} />;
  return <MonitorPlay size={14} className={iconClass} />;
};

const CourseOutline = ({ course, onNavigate }) => {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">สารบัญบทเรียน</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">ดูภาพรวมของบทเรียนทั้งหมดก่อนเริ่มเรียน</p>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
          {course.lessons?.length || 0} บทเรียน
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {course.lessons?.map((lesson, index) => (
          <button
            type="button"
            key={lesson.id}
            onClick={() => course.isEnrolled && onNavigate(`/user/courses/${course.id}/lesson/${lesson.id}`)}
            disabled={!course.isEnrolled}
            aria-label={course.isEnrolled ? `เปิดบทเรียน ${lesson.title}` : `บทเรียน ${lesson.title} ต้องลงทะเบียนก่อน`}
            className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ${
              course.isEnrolled
                ? 'bg-white hover:-translate-y-0.5 hover:border-primary/40'
                : 'cursor-default border-slate-100 bg-slate-50 opacity-80'
            }`}
            style={course.isEnrolled ? { borderColor: 'rgba(226, 232, 240, 0.5)', boxShadow: 'var(--shadow-premium)' } : {}}
          >
            {course.isEnrolled && (
              <div
                className={`absolute bottom-0 left-0 top-0 w-1 transition-all duration-300 ${
                  lesson.isCompleted ? 'bg-emerald-500' : 'bg-transparent group-hover:bg-primary'
                }`}
              />
            )}

            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] shadow-sm transition-all duration-300 ${
                lesson.isCompleted
                  ? 'bg-emerald-100 text-emerald-600 ring-1 ring-emerald-500/20'
                  : course.isEnrolled
                    ? 'bg-slate-100 text-slate-500 group-hover:bg-primary group-hover:text-white group-hover:shadow-md group-hover:shadow-primary/30'
                    : 'bg-slate-100 text-slate-300'
              }`}
            >
              {lesson.isCompleted ? <Check size={20} strokeWidth={3} /> : <PlayCircle size={22} strokeWidth={2.4} />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={`text-[15px] font-extrabold transition-colors duration-300 ${
                    lesson.isCompleted
                      ? 'text-slate-500'
                      : course.isEnrolled
                        ? 'text-slate-800 group-hover:text-primary'
                        : 'text-slate-600'
                  }`}
                >
                  {index + 1}. {lesson.title}
                </h3>
                {lesson.isCompleted && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black tracking-[0.04em] text-emerald-700 shadow-sm ring-1 ring-emerald-600/10">
                    ผ่านแล้ว
                  </span>
                )}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  {getLessonIcon(lesson, course.isEnrolled)}
                  {getLessonTypeLabel(lesson.type)}
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className={course.isEnrolled ? 'group-hover:text-primary/70' : ''} />
                  {lesson.duration || '10'} นาที
                </span>
              </div>
            </div>

            {course.isEnrolled ? (
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                  lesson.isCompleted
                    ? 'text-emerald-500 opacity-0 group-hover:opacity-100'
                    : 'bg-slate-50 text-slate-400 group-hover:bg-primary group-hover:text-white'
                }`}
              >
                {lesson.isCompleted ? <Check size={18} /> : <PlayCircle size={18} />}
              </div>
            ) : (
              <Bookmark size={20} className="shrink-0 text-slate-300" />
            )}
          </button>
        ))}
      </div>
    </section>
  );
};

export default CourseOutline;
