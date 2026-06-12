import React from 'react';
import { PlayCircle, ChevronRight, Target } from 'lucide-react';
import { ENROLLMENT_STATUS } from '../../utils/constants/statuses';

const HomeActivities = ({ courses, goalsProgress, onNavigate }) => {
  return (
    <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
      <h3 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight mb-5 px-1 md:px-2">กิจกรรมการเรียน</h3>
      <div className={`grid gap-5 md:gap-8 ${goalsProgress.length <= 1 ? 'grid-cols-1 md:grid-cols-2 items-center' : 'grid-cols-1'}`}>
        <button
          type="button"
          onClick={() => onNavigate('/user/ongoing')}
          className="group relative flex items-center gap-6 rounded-[2.5rem] bg-white p-8 border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 text-left w-full"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/5 text-primary transition-transform group-hover:rotate-12 duration-500">
            <PlayCircle size={32} />
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-1">กำลังเรียนอยู่</p>
            <h3 className="text-2xl font-black text-slate-800 leading-none">
              {courses.filter((course) => course.isEnrolled && course.enrollmentStatus === ENROLLMENT_STATUS.IN_PROGRESS).length} คอร์ส
            </h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <ChevronRight size={20} />
          </div>
        </button>

        <div className={`flex flex-col gap-4 ${goalsProgress.length >= 2 ? 'md:grid md:grid-cols-2 md:gap-8' : ''}`}>
          {goalsProgress.length > 0 ? (
            goalsProgress.map((gp) => (
              <button
                key={gp.id}
                type="button"
                onClick={() => onNavigate(`/user/goals/${gp.id}`)}
                className="group relative flex items-center gap-6 rounded-[2.5rem] bg-white p-8 border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 w-full text-left"
              >
                <div className={`flex h-16 w-16 items-center justify-center rounded-3xl transition-transform group-hover:scale-110 duration-500 shrink-0 ${gp.current >= gp.target ? 'bg-success text-white shadow-lg shadow-success/20' : 'bg-slate-800 text-white shadow-lg shadow-slate-800/20'}`}>
                  <Target size={28} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">{gp.title}</p>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border leading-none ${gp.scope === 'DEPARTMENT' ? 'border-warning-border text-warning-text bg-warning-bg' : 'border-info-border text-info-text bg-info-bg'}`}>
                      {gp.scope === 'DEPARTMENT' ? (gp.deptName || 'แผนก') : 'องค์กร'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 leading-none mb-3">{gp.current}/{gp.target} คอร์ส</h3>
                  <div className="relative w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${gp.current >= gp.target ? 'bg-success' : 'bg-primary'}`}
                      style={{ width: `${Math.min(100, (gp.current / gp.target) * 100)}%` }}
                    />
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="group relative flex items-center gap-6 rounded-[2.5rem] bg-slate-50 p-8 border border-dashed border-slate-200 opacity-60">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-200 text-slate-400 shrink-0">
                <Target size={28} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-1">No Active Goals</p>
                <h3 className="text-xl font-bold text-slate-400 leading-none">ยังไม่มีเป้าหมายในขณะนี้</h3>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeActivities;
