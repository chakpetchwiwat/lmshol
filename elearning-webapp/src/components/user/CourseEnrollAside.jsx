import React from 'react';
import { PlayCircle, ArrowLeft, MonitorPlay } from 'lucide-react';
import { getFullUrl, DEFAULT_COURSE_IMAGE } from '../../utils/api';

const parseYoutubePreview = (url) => {
  if (!url) return '';
  if (url.includes('youtube.com/embed/')) return url;
  const watchId = url.match(/[?&]v=([^&]+)/)?.[1];
  if (watchId) return `https://www.youtube.com/embed/${watchId}?autoplay=1`;
  const shortId = url.match(/youtu\.be\/([^?&]+)/)?.[1];
  if (shortId) return `https://www.youtube.com/embed/${shortId}?autoplay=1`;
  return url;
};

const CourseEnrollAside = ({
  course,
  enrolling,
  showVideo,
  setShowVideo,
  isScrolled,
  onEnroll,
  onNavigate,
  totalRewardPoints,
  completionPoints,
  quizPoints,
  whatYouGet,
  benefitsIconMap
}) => {
  return (
    <aside className="w-full shrink-0 lg:w-[320px]">
      <div 
        className={`sticky top-24 overflow-hidden rounded-[2rem] border bg-white transition-transform duration-500 ${isScrolled ? 'lg:-translate-y-3' : ''}`}
        style={{ borderColor: 'rgba(226, 232, 240, 0.5)', boxShadow: 'var(--shadow-card-hover)' }}
      >
        <div className="relative aspect-video overflow-hidden bg-slate-950">
          {showVideo && course.previewVideoUrl ? (
            <iframe
              className="h-full w-full"
              src={parseYoutubePreview(course.previewVideoUrl)}
              title="ตัวอย่างคอร์ส"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          ) : (
            <>
              <img
                src={course.image ? getFullUrl(course.image) : DEFAULT_COURSE_IMAGE}
                alt={course.title}
                className="h-full w-full object-cover transition-all duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
              <button
                type="button"
                className="absolute inset-0 flex flex-col items-center justify-center"
                onClick={() => course.previewVideoUrl && setShowVideo(true)}
                disabled={!course.previewVideoUrl}
                aria-label="เล่นวิดีโอตัวอย่างคอร์ส"
              >
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-white/20 text-white shadow-xl backdrop-blur-md transition-colors duration-300 hover:bg-primary">
                  <PlayCircle size={32} className="ml-1" strokeWidth={2} />
                </div>
                <span className="text-[13px] font-bold tracking-[0.04em] text-white drop-shadow-md">ดูตัวอย่างคอร์สฟรี</span>
              </button>
            </>
          )}
        </div>

        <div className="p-6 md:p-7">
          <div className="mb-4">
            <span className="mb-2 block text-[11px] font-bold tracking-[0.04em] text-slate-600">แต้มรวมสูงสุด</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black tracking-tighter text-slate-900 md:text-4xl">
                {totalRewardPoints > 0 ? totalRewardPoints.toLocaleString() : '0'}
              </span>
              <span className="mb-1 text-sm font-bold text-slate-500">แต้ม</span>
            </div>
            <div className="mt-3 space-y-2 text-xs font-bold text-slate-500">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                <span>เรียนจบคอร์ส</span>
                <span>{completionPoints.toLocaleString()} แต้ม</span>
              </div>
              {quizPoints > 0 && (
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                  <span>ผ่านแบบทดสอบ</span>
                  <span>{quizPoints.toLocaleString()} แต้ม</span>
                </div>
              )}
            </div>
          </div>

          {course.isEnrolled ? (
            <div className="flex flex-col gap-3">
              <div className="mb-1 h-2 w-full rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-primary transition-all duration-1000" style={{ width: `${course.progressPercent || 0}%` }}></div>
              </div>
              <p className="text-center text-sm font-bold text-slate-500">เรียนไปแล้ว {course.progressPercent || 0}%</p>
              <button
                type="button"
                onClick={() => onNavigate(`/user/courses/${course.id}/lesson/${course.lessons[0]?.id}`)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-[15px] font-bold text-white shadow-lg shadow-primary/30 transition-colors hover:bg-primary-hover"
              >
                {course.progressPercent === 100 ? 'ทบทวนบทเรียน' : course.progressPercent === 0 ? 'เริ่มเรียนเลย' : 'เรียนต่อให้จบ'}
                <ArrowLeft size={18} className="rotate-180" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onEnroll}
              disabled={enrolling}
              className="flex w-full items-center justify-center rounded-xl bg-primary py-4 text-[15px] font-bold text-white shadow-lg shadow-primary/30 transition-colors hover:bg-primary-hover disabled:opacity-70"
            >
              {enrolling ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div> : 'ลงทะเบียนเรียนทันที'}
            </button>
          )}

          <p className="mt-4 text-center text-xs font-bold text-slate-400">พร้อมเรียนได้ทันทีบนทุกอุปกรณ์</p>

          {whatYouGet && whatYouGet.length > 0 && (
            <div className="mt-8 flex flex-col gap-4 border-t border-slate-100 pt-6">
              <h3 className="text-sm font-black text-slate-900">สิ่งที่จะได้รับ</h3>
              {whatYouGet.map((item, index) => {
                const text = typeof item === 'string' ? item : item.text;
                const iconKey = typeof item === 'string' ? 'video' : item.icon;
                const IconComponent = benefitsIconMap[iconKey] || MonitorPlay;

                return (
                  <div key={index} className="flex items-start gap-3 text-[13.5px] font-medium text-slate-600">
                    <IconComponent size={18} className="mt-0.5 shrink-0 text-primary" />
                    <span>{text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default CourseEnrollAside;
