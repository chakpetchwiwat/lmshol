import React from 'react';
import { Users, Droplet, Flame, BookOpen, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

const SupervisedSheepWidget = ({ data, onViewUser }) => {
  const safeData = data || [];

  return (
    <div className="card card-no-lift flex h-full min-w-0 flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Users size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-slate-900">ลูกแกะของคุณ (Shepherd View)</h3>
            <p className="text-sm text-slate-500">ติดตามและดูแลความคืบหน้าของลูกแกะที่อยู่ในความดูแลของคุณ</p>
          </div>
        </div>
        <span className="badge badge-primary badge-sm">{safeData.length} คน</span>
      </div>

      <div className="flex-1 overflow-auto max-h-[400px] pr-1">
        {safeData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safeData.map((sheep) => (
              <div
                key={sheep.id}
                className="group flex flex-col rounded-2xl border border-slate-100 p-4 text-left transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/20"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onViewUser?.(sheep.id)}
                      className="text-sm font-black text-slate-800 hover:text-primary hover:underline truncate"
                    >
                      {sheep.name} ({sheep.nickname})
                    </button>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {sheep.tier.split(' - ')[0] || sheep.tier} · สังกัด {sheep.department}
                    </p>
                  </div>
                </div>

                {/* Baptism indicators */}
                <div className="flex gap-2 mb-3">
                  <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black ${
                    sheep.waterBaptismDate 
                      ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                      : 'bg-slate-50 text-slate-400 border border-slate-100'
                  }`}>
                    <Droplet size={10} className={sheep.waterBaptismDate ? 'text-blue-500' : 'text-slate-300'} />
                    น้ำ: {sheep.waterBaptismDate ? '✅' : '⏳'}
                  </span>
                  
                  <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black ${
                    sheep.spiritBaptismDate 
                      ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                      : 'bg-slate-50 text-slate-400 border border-slate-100'
                  }`}>
                    <Flame size={10} className={sheep.spiritBaptismDate ? 'text-rose-500' : 'text-slate-300'} />
                    วิญญาณ: {sheep.spiritBaptismDate ? '✅' : '⏳'}
                  </span>
                </div>

                {/* Active Learning Progress */}
                <div className="mt-auto border-t border-slate-100/70 pt-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="truncate font-semibold flex items-center gap-1">
                      <BookOpen size={12} className="text-slate-400" />
                      {sheep.latestCourse}
                    </span>
                    <span className="font-bold text-slate-500">{Math.round(sheep.progress)}%</span>
                  </div>
                  
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-indigo-500`}
                      style={{ width: `${sheep.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
              <Users size={24} className="text-slate-200" />
            </div>
            <p className="text-sm font-bold text-slate-400">ไม่มีรายชื่อลูกแกะโดยตรง</p>
            <p className="text-xs text-slate-300">สามารถมอบหมายผู้ดูแลได้ในเมนูจัดการ Role หรือผู้ใช้นี้ไม่ใช่พี่เลี้ยงโดยตรง</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisedSheepWidget;
