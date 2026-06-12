import React from 'react';
import { ArrowUpRight, BellRing, CalendarClock, FileText, PlayCircle, ClipboardCheck, BookOpen } from 'lucide-react';
import { DEFAULT_COURSE_IMAGE, getFullUrl } from '../../utils/api';
import { formatThaiDateTime } from '../../utils/dateUtils';

const getTypeMeta = (type) => {
  if (type === 'video') return { label: 'วิดีโอ', icon: PlayCircle };
  if (type === 'quiz') return { label: 'แบบทดสอบ', icon: ClipboardCheck };
  if (type === 'pdf' || type === 'document') return { label: 'เอกสาร', icon: FileText };
  return { label: 'บทความ', icon: BookOpen };
};

const AnnouncementCard = ({ announcement, onClick, className = '' }) => {
  const { label, icon: TypeIcon } = getTypeMeta(announcement.type);

  return (
    <div className={`group h-full ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className="flex h-full w-full flex-col overflow-hidden rounded-[2rem] border border-amber-200/70 bg-white text-left shadow-[0_22px_50px_-35px_rgba(146,64,14,0.28)] transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-300 hover:shadow-[0_28px_65px_-36px_rgba(146,64,14,0.34)]"
        aria-label={`เปิดประกาศ ${announcement.title}`}
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-amber-50">
          <img
            src={announcement.image ? getFullUrl(announcement.image) : DEFAULT_COURSE_IMAGE}
            alt={announcement.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/78 via-slate-900/15 to-transparent" />

          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50/95 px-3 py-1 text-[11px] font-black tracking-[0.04em] text-amber-700 shadow-sm">
              <BellRing size={12} />
              ประกาศกอง
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black tracking-[0.04em] text-slate-700 shadow-sm">
              <TypeIcon size={12} />
              {label}
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 text-white">
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.04em] text-amber-100/95">
                สำหรับกอง {announcement.department?.name || 'ของคุณ'}
              </p>
              <p className="mt-1 text-sm font-semibold text-white/95">
                คลิกเพื่ออ่านประกาศทันที
              </p>
            </div>

            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/12 text-white transition-all duration-300 group-hover:-translate-y-0.5 group-hover:bg-white/20">
              <ArrowUpRight size={18} strokeWidth={2.4} />
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
          <div className="flex flex-1 flex-col">
            <h3 className="line-clamp-2 text-[1.08rem] font-black leading-[1.35] text-slate-900 transition-colors group-hover:text-amber-700">
              {announcement.title}
            </h3>

            {announcement.description && (
              <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-slate-500">
                {announcement.description}
              </p>
            )}

            <div className="mt-auto flex items-center justify-between border-t border-amber-100/80 pt-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <CalendarClock size={14} className="text-amber-600" />
                <span>
                  หมดอายุ {announcement.expiredAt ? formatThaiDateTime(announcement.expiredAt, true) : 'ไม่กำหนด'}
                </span>
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.08em] text-amber-700">
                Announcement
              </span>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
};

export default AnnouncementCard;
