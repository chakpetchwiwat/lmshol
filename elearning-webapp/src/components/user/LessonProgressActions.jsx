import React from 'react';
import { CheckCircle, ArrowRight, BookOpen, Clock } from 'lucide-react';

const LessonProgressActions = ({
  lesson,
  completed,
  updating,
  handleComplete,
  handleReturnToCourse,
  handleNavigateToNextLesson,
  nextLesson,
  currentLessonIndex,
  totalLessons,
  completedLessonsCount
}) => {
  const getLessonTypeLabel = (type) => {
    if (type === 'quiz') return 'แบบทดสอบ';
    if (type === 'video') return 'วิดีโอ';
    if (type === 'article') return 'บทความ';
    if (type === 'pdf' || type === 'document') return 'เอกสาร';
    return 'เอกสาร';
  };

  return (
    <div className="w-full">
      {!completed && lesson.type !== 'quiz' && (
        <section className="mt-12 -mx-6 border-y border-slate-100 bg-slate-50/70 p-6 md:mx-0 md:rounded-[2.5rem] md:border md:bg-white md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.04em] text-slate-500">พร้อมไปต่อ</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                {lesson.type === 'video' ? 'ดูจบแล้วกดทำเครื่องหมายบทเรียนนี้' : 'อ่านจบแล้วกดทำเครื่องหมายบทเรียนนี้'}
              </h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                เมื่อทำบทเรียนนี้เสร็จ ระบบจะอัปเดตความคืบหน้าให้ และถ้ามีบทถัดไปจะแสดงปุ่มไปต่อทันที
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-nowrap">
              <button
                onClick={handleReturnToCourse}
                className="inline-flex items-center justify-center rounded-[1.25rem] border-2 border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 whitespace-nowrap transition-all hover:bg-slate-50 active:scale-95"
              >
                กลับหน้าคอร์ส
              </button>
              <button
                onClick={handleComplete}
                disabled={updating}
                className="inline-flex items-center justify-center gap-3 rounded-[1.25rem] bg-slate-900 px-7 py-4 text-sm font-black text-white whitespace-nowrap shadow-[0_20px_40px_-10px_rgba(15,23,42,0.4)] transition-all hover:bg-primary active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updating ? 'กำลังบันทึก...' : 'ฉันเรียนเสร็จแล้ว'}
                <CheckCircle size={18} strokeWidth={2.6} />
              </button>
            </div>
          </div>
        </section>
      )}

      {completed && (
        <section className="mt-12 -mx-6 md:mx-0 md:rounded-[3rem] border-y md:border-x border-emerald-100 bg-emerald-50/40 md:bg-white p-8 md:p-12 transition-all duration-300 shadow-sm">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center md:items-start gap-4 md:gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-[0_15px_30px_-8px_rgba(16,185,129,0.4)]">
                  <CheckCircle className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-2xl font-black tracking-tight text-slate-900 md:text-[2.25rem]">
                    เรียนบทนี้แล้ว
                  </h3>
                </div>
              </div>

              <div className="flex items-center justify-center gap-10 md:gap-8 self-center md:self-start w-full md:w-auto border-t border-emerald-100/50 pt-6 md:border-0 md:pt-0">
                <div className="flex flex-col items-center md:items-start">
                  <p className="text-[10px] md:text-[11px] font-black tracking-[0.04em] text-slate-500 uppercase">คืบหน้า</p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">{Math.min(completedLessonsCount, totalLessons)}</span>
                    <span className="text-sm font-bold text-slate-400">/ {totalLessons} บท</span>
                  </div>
                </div>
                <div className="w-px h-8 bg-emerald-100/50 md:hidden"></div>
                <div className="flex flex-col items-center md:items-start">
                  <p className="text-[10px] md:text-[11px] font-black tracking-[0.04em] text-slate-500 uppercase">ตอนนี้</p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">{currentLessonIndex + 1}</span>
                    <span className="text-sm font-bold text-slate-400">/ {totalLessons}</span>
                  </div>
                </div>
              </div>
            </div>

            {nextLesson ? (
              <div className="mt-6 border-t border-emerald-100/50 pt-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black tracking-[0.04em] text-primary uppercase">บทถัดไป</p>
                    <h4 className="mt-2 text-xl md:text-2xl font-normal tracking-tight text-slate-900 leading-tight">
                      {nextLesson.title}
                    </h4>
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <BookOpen size={16} className="text-slate-400" />
                        {getLessonTypeLabel(nextLesson.type)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <Clock size={16} className="text-slate-400" />
                        {nextLesson.duration || '10'} นาที
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-nowrap">
                    <button
                      onClick={handleReturnToCourse}
                      className="inline-flex items-center justify-center rounded-[1.25rem] border-2 border-slate-100 bg-white px-7 py-4 text-sm font-black text-slate-700 whitespace-nowrap transition-all hover:bg-slate-50 active:scale-95"
                    >
                      กลับหน้าคอร์ส
                    </button>
                    <button
                      onClick={handleNavigateToNextLesson}
                      className="inline-flex items-center justify-center gap-3 rounded-[1.25rem] bg-slate-900 px-7 py-4 text-sm font-black text-white whitespace-nowrap shadow-[0_20px_40px_-10px_rgba(15,23,42,0.4)] transition-all hover:bg-primary active:scale-95"
                    >
                      ไปบทถัดไป
                      <ArrowRight size={18} strokeWidth={2.8} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 border-t border-emerald-100/50 pt-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black tracking-[0.04em] text-emerald-700 uppercase">ครบแล้ว</p>
                    <h4 className="mt-2 text-2xl font-normal tracking-tight text-slate-900">
                      จบหลักสูตรอย่างเป็นทางการแล้ว!
                    </h4>
                  </div>

                  <button
                    onClick={handleReturnToCourse}
                    className="inline-flex items-center justify-center gap-3 rounded-[1.25rem] bg-slate-900 px-8 py-4 text-sm font-black text-white whitespace-nowrap shadow-[0_20px_40px_-10px_rgba(15,23,42,0.4)] transition-all hover:bg-primary active:scale-95"
                  >
                    กลับหน้าคอร์ส
                    <ArrowRight size={18} strokeWidth={2.8} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default LessonProgressActions;
