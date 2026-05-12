import React from 'react';
import { ArrowUpRight, Bookmark, CheckCircle2, Clock, Layers3 } from 'lucide-react';
import { DEFAULT_COURSE_IMAGE, getFullUrl, userAPI } from '../../utils/api';
import { useToast } from '../../context/useToast';
import { formatThaiFullDate } from '../../utils/dateUtils';
import { ENROLLMENT_STATUS } from '../../utils/constants/statuses';

const CourseCard = ({ course, onClick, className = '', variant = 'default', onBookmarkChange }) => {
  const toast = useToast();
  const [isBookmarked, setIsBookmarked] = React.useState(!!course.isBookmarked);
  const [bookmarking, setBookmarking] = React.useState(false);
  const isCompleted = variant === 'completed' || course.enrollmentStatus === ENROLLMENT_STATUS.COMPLETED;
  const isInProgress = course.isEnrolled && !isCompleted;
  const categoryLabel = course.category?.name || 'หมวดทั่วไป';
  const lessonCount = course.lessonsCount ?? (Array.isArray(course.lessons) ? course.lessons.length : 0);
  const progressPercent = Math.max(0, Math.min(100, Number(course.progressPercent) || 0));
  const displayPoints = course.totalPoints ?? course.points ?? 0;
  const pointsSuffix = displayPoints > 0 ? 'แต้มรวม' : 'เรียน';

  const lessonDuration = course.lessons?.reduce(
    (total, lesson) => total + (parseInt(lesson.duration, 10) || 0),
    0
  );

  const durationLabel = course.totalDuration || (lessonDuration > 0 ? `${lessonDuration} นาที` : 'พรีเมียม');
  const statusLabel = isCompleted ? 'เรียนจบแล้ว' : isInProgress ? 'กำลังเรียน' : 'พร้อมเริ่ม';
  const eyebrowLabel = isCompleted
    ? 'ทบทวนได้ทันที'
    : isInProgress
      ? 'กลับมาเรียนต่อได้'
      : 'คอร์สแนะนำ';

  const temporaryLabel = course.isTemporary
    ? `เข้าดูได้ถึง${course.expiredAt ? ` · ${formatThaiFullDate(course.expiredAt)}` : ''}`
    : '';

  React.useEffect(() => {
    setIsBookmarked(!!course.isBookmarked);
  }, [course.isBookmarked]);

  const handleBookmarkClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (bookmarking) return;

    const nextValue = !isBookmarked;
    setIsBookmarked(nextValue);
    setBookmarking(true);
    onBookmarkChange?.(course.id, nextValue);

    try {
      if (nextValue) {
        await userAPI.bookmarkCourse(course.id);
        toast.success('บันทึกคอร์สแล้ว');
      } else {
        await userAPI.unbookmarkCourse(course.id);
        toast.success('นำออกจากคอร์สที่บันทึกแล้ว');
      }
    } catch (error) {
      console.error('Bookmark course error:', error);
      setIsBookmarked(!nextValue);
      onBookmarkChange?.(course.id, !nextValue);
      toast.error('อัปเดตคอร์สที่บันทึกไม่สำเร็จ');
    } finally {
      setBookmarking(false);
    }
  };

  return (
    <div className={`group h-full self-stretch ${className}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick?.(event);
          }
        }}
        aria-label={`เปิดคอร์ส ${course.title}`}
        className="flex h-full w-full flex-col overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-white text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-[0_26px_55px_-34px_rgba(15,23,42,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        style={{
          boxShadow: '0 22px 45px -36px rgba(15, 23, 42, 0.24)',
        }}
      >
        <div 
          className="relative w-full overflow-hidden bg-slate-100"
          style={{ aspectRatio: '16/10' }}
        >
          <img
            src={course.image ? getFullUrl(course.image) : DEFAULT_COURSE_IMAGE}
            alt={course.title}
            loading="lazy"
            width={400}
            height={250}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
  
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/72 via-slate-900/12 to-transparent" />
  
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3.5">
            <span 
              title={categoryLabel}
              className="inline-flex max-w-[55%] shrink-0 truncate rounded-full bg-white/92 px-3 py-1 text-[11px] font-black tracking-[0.04em] text-slate-700 shadow-sm"
            >
              {categoryLabel}
            </span>
  
            <div className="flex shrink-0 flex-col items-end gap-2">
              {course.isEnrolled && (
                <span
                  className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.04em] shadow-sm ${
                    isCompleted
                      ? 'bg-success-bg text-success-text'
                      : 'bg-blue-600 text-white shadow-md'
                  }`}
                >
                  {statusLabel}
                </span>
              )}
  
              <button
                type="button"
                aria-label={isBookmarked ? `นำ ${course.title} ออกจากคอร์สที่บันทึก` : `บันทึกคอร์ส ${course.title}`}
                aria-pressed={isBookmarked}
                onClick={handleBookmarkClick}
                className={`flex h-10 w-10 items-center justify-center rounded-full border text-white shadow-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                  isBookmarked
                    ? 'border-amber-200 bg-amber-400 text-slate-950 opacity-100'
                    : 'border-white/25 bg-slate-950/30 opacity-100 backdrop-blur-md'
                } ${bookmarking ? 'pointer-events-none opacity-60' : 'hover:-translate-y-0.5 hover:bg-amber-400 hover:text-slate-950'}`}
              >
                <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} strokeWidth={2.4} />
              </button>
            </div>
          </div>
  
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 text-white">
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.03em] text-white/85">
                {eyebrowLabel}
              </p>
              <p className="mt-1 text-sm font-semibold text-white/95">
                {isCompleted ? 'กลับมาเปิดเมื่อไรก็ได้' : isInProgress ? 'ไปต่อจากจุดเดิมได้เลย' : 'เปิดดูรายละเอียดคอร์ส'}
              </p>
            </div>
  
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/12 text-white transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:bg-white/18">
              {isCompleted ? <CheckCircle2 size={18} strokeWidth={2.4} /> : <ArrowUpRight size={18} strokeWidth={2.4} />}
            </span>
          </div>
        </div>
  
        <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <Layers3 size={13} className="text-slate-400" />
                <span>{lessonCount} บทเรียน</span>
              </div>
              <div className="h-1 w-1 rounded-full bg-slate-300" />
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <Clock size={13} className="text-slate-400" />
                <span>{durationLabel}</span>
              </div>
            </div>
    
            <h3 className="mt-2 line-clamp-2 min-h-[3.15rem] text-[1.05rem] font-black leading-[1.35] text-slate-900 transition-colors group-hover:text-primary">
              {course.title}
            </h3>

            {course.isTemporary && (
              <div className="mt-3 flex justify-center">
                <span className="inline-flex rounded-full border border-warning-border bg-warning-bg px-3.5 py-1.5 text-[13px] font-black uppercase tracking-[0.08em] text-warning-text shadow-sm">
                  {temporaryLabel}
                </span>
              </div>
            )}
    
            <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-4">
              <div className="flex-1">
                {isInProgress && progressPercent > 0 && (
                  <div className="flex flex-col items-start w-full">
                    <span className="text-sm font-black text-primary">{progressPercent}%</span>
                    <div className="mt-1.5 h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-slate-100">
                      <div 
                        className="h-full bg-primary transition-all duration-700" 
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end">
                <span className="text-xl font-black tabular-nums text-slate-800">
                  {displayPoints > 0 ? displayPoints.toLocaleString() : 'FREE'}
                </span>
                <span className="mt-1 block text-[10px] font-bold tracking-[0.04em] text-slate-500">
                  {pointsSuffix}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CourseCard);
