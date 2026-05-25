import React from 'react';
import { PlayCircle, Target } from 'lucide-react';
import { ENROLLMENT_STATUS } from '../../utils/constants/statuses';

const HomeHero = ({ 
  user, 
  courses, 
  points, 
  pointsLoading, 
  continueCourse, 
  onNavigate 
}) => {
  return (
    <section className="relative -mx-5 overflow-hidden rounded-none border-b border-slate-200 bg-[linear-gradient(135deg,#fffdf8_0%,#f8fafc_55%,#eef4ff_100%)] md:mx-0 md:rounded-[2.5rem] md:border md:border-slate-200 shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(180,83,9,0.08),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(67,56,202,0.08),transparent_32%)]"></div>
      
      <div className="relative z-10 grid lg:grid-cols-[minmax(0,1.1fr)_380px] gap-10 items-center p-7 md:p-12 lg:p-16">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest mb-6 border border-primary/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Learning Dashboard
          </div>
          
          <h1 className="text-3xl md:text-5xl lg:text-[3.4rem] font-bold text-slate-900 tracking-tight leading-[1.12] mb-6 flex flex-wrap items-baseline justify-center lg:justify-start">
            <span>สวัสดีคุณ</span>
            <span className="mx-2 lg:mx-3 text-primary inline-block">
              {user?.name ? (user.name.split(' ')[0] === 'คุณ' ? user.name.split(' ')[1] : user.name.split(' ')[0]) : 'ผู้ใช้งาน'}
            </span> 👋
          </h1>
          <p className="mb-8 max-w-xl text-base md:text-lg font-medium text-slate-600 leading-relaxed">
            พร้อมที่จะอัปเกรดทักษะของคุณแล้วหรือยัง? วันนี้มีบทเรียนใหม่ๆ <br />รอคุณอยู่มากมาย
          </p>
          
          <div className="flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-4 w-full pt-6 border-t border-slate-300/50">
            <div className="flex flex-col text-left">
              <p className="mb-1 text-[11px] font-semibold tracking-[0.04em] text-slate-500">กําลังเรียน</p>
              <p className="text-2xl font-bold text-slate-800">
                {courses.filter(c => c.isEnrolled && c.enrollmentStatus === ENROLLMENT_STATUS.IN_PROGRESS).length}
              </p>
            </div>
            <div className="flex flex-col text-left">
              <p className="mb-1 text-[11px] font-semibold tracking-[0.04em] text-slate-500">เรียนจบแล้ว</p>
              <p className="text-2xl font-bold text-slate-800">
                {courses.filter(c => c.enrollmentStatus === ENROLLMENT_STATUS.COMPLETED).length}
              </p>
            </div>
            <div className="flex flex-col text-left">
              <p className="mb-1 text-[11px] font-semibold tracking-[0.04em] text-slate-500">คะแนนสะสม</p>
              <p className="text-2xl font-bold text-primary">
                {pointsLoading ? '...' : points.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="relative flex justify-center items-center lg:h-full">
          {/* Visual Asset */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(180,83,9,0.14),transparent_34%),radial-gradient(circle_at_center,rgba(67,56,202,0.1),transparent_58%)] blur-3xl scale-110"></div>
          
          {/* Floating Action Overlay (Desktop Only) */}
          <div className="hidden lg:block absolute -right-4 top-1/4 z-20 animate-slide-up delay-300">
            {continueCourse ? (
              <button
                onClick={() => onNavigate(`/user/courses/${continueCourse.id}`)}
                className="flex items-center gap-4 rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-28px_rgba(15,23,42,0.4)] group"
              >
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <PlayCircle size={24} />
                </div>
                <div className="max-w-[180px] text-left">
                  <p className="mb-1 text-[11px] font-bold tracking-[0.04em] text-primary">เรียนต่อ</p>
                  <h3 className="text-sm font-bold text-slate-800 truncate">{continueCourse.title}</h3>
                </div>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('/user/courses')}
                className="flex items-center gap-4 rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-28px_rgba(15,23,42,0.4)]"
              >
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Target size={24} />
                </div>
                <div className="max-w-[180px] text-left">
                  <p className="mb-1 text-[11px] font-bold tracking-[0.04em] text-slate-500">มาเริ่มกันเลย</p>
                  <h3 className="text-sm font-bold text-slate-800">ค้นหาคอร์สที่ใช่</h3>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
